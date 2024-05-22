from bs4 import BeautifulSoup
import requests
from utils.proxy import get_free_proxies
from enum import Enum
import yagooglesearch
import re
import logging


class JobSite(Enum):
    LEVER = "lever.co"
    GREENHOUSE = "boards.greenhouse.io/*/jobs/*"
    ASHBY = "ashbyhq.com"
    ANGELLIST = "TODO"
    WORKABLE = "apply.workable.com/*/"
    INDEED = "TODO"
    GLASSDOOR = "TODO"
    LINKEDIN = "TODO"
    JOBVITE = "jobs.jobvite.com/*/"
    BREEZY = "*.breezy.hr"
    APPLYTOJOB = "*.applytojob.com"
    BAMBOOHR = "*.bamboohr.com"
    

class TBS(Enum):
    PAST_TWELVE_HOURS = "qdr:h12"
    PAST_DAY = "qdr:d"
    PAST_WEEK = "qdr:w"
    PAST_MONTH = "qdr:m"
    PAST_YEAR = "qdr:y"


def find_jobs(
    keyword: str,
    job_sites: list[JobSite],
    tbs: TBS | None,
    max_results: int = 200,
):
    proxies = [None] + get_free_proxies()
    proxy_index = 0

    success = False
    result = []

    while not success:
        try:
            proxy = proxies[proxy_index]
            proxy_index += 1

            if proxy_index >= len(proxies):
                print("No more proxies to try.")
                break
            search_sites = " OR ".join([f"site:{site.value}" for site in job_sites])
            search_query = f"{keyword} {search_sites}"
            print(f"Searching for {search_query} using proxy {proxy}")
            client = yagooglesearch.SearchClient(
                search_query,
                tbs=tbs.value if tbs else None,
                max_search_result_urls_to_return=max_results,
                proxy=proxy,
                verbosity=0,
            )
            client.assign_random_user_agent()
            result = client.search()
            success = True
        except Exception as e:
            print(f"Error using proxy {proxy}: ", e)

    job_urls_by_board = {}
    for job_site in job_sites:
        job_urls_for_job_site = [
            url for url in result if re.search(regex[job_site], url)
        ]
        cleaner = JobSearchResultCleaner(job_site)
        job_urls_by_board[job_site] = cleaner.clean(job_urls_for_job_site)

    return job_urls_by_board


def get_lever_job_details(link: str) -> list[str]:
    response = requests.get(link)
    soup = BeautifulSoup(response.content, "html.parser")

    title = soup.title.string if soup.title else "Unknown"
    company_name = title.split("-")[0].strip() if "-" in title else title.strip()
    position = "-".join(title.split("-")[1:]).strip() if "-" in title else "Unknown"
    if ("engineer" or "developer") not in position.lower():
        return ["Not found – 404 error", "Unknown", None]

    img = soup.find("img")
    if img and img["src"] and img["src"] != "/img/lever-logo-full.svg":
        img_url = img["src"]
    else:
        img_url = None

    return [company_name, position, img_url]


def get_greenhouse_job_details(link: str) -> list[str]:
    response = requests.get(link)
    soup = BeautifulSoup(response.content, "html.parser")
    head = soup.find("head")

    position = (
        head.find("meta", property="og:title")["content"]
        if head.find("meta", property="og:title")
        else "Unknown"
    )

    image = (
        head.find("meta", property="og:image")["content"]
        if head.find("meta", property="og:image")
        else None
    )

    if ("engineer" or "developer") not in position.lower():
        return ["Not found – 404 error", "Unknown", None]

    title = soup.title.string if soup.title else "Unknown"

    company_name = title.split(" at ")[1].strip() if " at " in title else title.strip()
    return [company_name, position, image]


def get_ashby_job_details(link: str) -> list[str]:
    response = requests.get(link)
    soup = BeautifulSoup(response.content, "html.parser")
    head = soup.find("head")
    title = head.find("title").string

    company_name = title.split(" @ ")[1].strip() if " @ " in title else title.strip()
    position = title.split(" @ ")[0].strip() if " @ " in title else "Unknown"

    image = (
        head.find("meta", property="og:image")["content"]
        if head.find("meta", property="og:title")
        else None
    )

    return [company_name, position, image]
    
    

def handle_job_insert(supabase: any, job_urls: list[str], job_site: JobSite):
    for link in job_urls:
        try:
            job_details = []
            if job_site == JobSite.LEVER:
                job_details = get_lever_job_details(link)
            elif job_site == JobSite.GREENHOUSE:
                job_details = get_greenhouse_job_details(link)
            elif job_site == JobSite.ASHBY:
                job_details = get_ashby_job_details(link)
            if (
                job_details[0] == "Not found – 404 error"
                and job_details[1] == "Unknown"
            ):
                continue
            job = {}
            job["company"] = job_details[0]
            job["job_title"] = job_details[1]
            job["image"] = job_details[2]
            job["job_url"] = link
            job["job_board"] = job_site.name
            print("Inserting job: ", job)
            supabase.insert_job(job)
        except Exception as e:
            logging.error(f"Failed to process job: {str(e)}")

regex = {
    JobSite.LEVER: r"https://jobs.lever.co/[^/]+/[^/]+",
    JobSite.GREENHOUSE: r"https://boards.greenhouse.io/[^/]+/jobs/[^/]+",
    JobSite.ASHBY: r"https://jobs.ashbyhq.com/[^/]+/[^/]+",
    JobSite.JOBVITE: r"https://jobs.jobvite.com/[^/]+/[^/]+",
    JobSite.WORKABLE: r"https://apply.workable.com/[^/]+/[^/]+",
    JobSite.BREEZY: r"https://[^/]+.breezy.hr/[^/]+",
    JobSite.APPLYTOJOB: r"https://[^/]+.applytojob.com/[^/]+",
    JobSite.BAMBOOHR: r"https://[^/]+.bamboohr.com/[^/]+/jobs/view.php?id=[0-9]+",
    JobSite.INDEED: "TODO",
    JobSite.GLASSDOOR: "TODO",
    JobSite.LINKEDIN: "TODO",
}


class JobSearchResultCleaner:

    def __init__(self, job_site: JobSite):
        self.job_site = job_site

    def _prune_urls(self, urls: list[str]) -> list[str]:
        return [
            re.search(regex[self.job_site], url).group()
            for url in urls
            if re.search(regex[self.job_site], url)
        ]

    def _remove_duplicates(self, urls: list[str]) -> list[str]:
        return list(set(urls))

    def _make_direct_apply_urls(self, urls: list[str]) -> list[str]:
        if self.job_site == JobSite.LEVER:
            urls = [re.sub(r"\?.*", "", url) for url in urls]
            # clean the url of all query parameters
            return [url + "/apply" for url in urls]
        if self.job_site == JobSite.GREENHOUSE:
            cleaned_urls = [re.sub(r"\?.*", "", url) for url in urls]
            urls = [
                re.sub(
                    r"https://boards.greenhouse.io/([^/]+)/jobs/([^/]+)",
                    r"https://boards.greenhouse.io/embed/job_app?for=\1&token=\2",
                    url,
                )
                for url in cleaned_urls
            ]
            return urls
        if self.job_site == JobSite.ASHBY:
            urls = [re.sub(r"\?.*", "", url) for url in urls]
            return [url + "/application?embed=js" for url in urls]
        
        return urls

    def clean(self, job_search_result: list) -> list[str]:
        """Clean the job search result to only include valid job URLs."""
        if not job_search_result:
            return []
        try:
            return self._make_direct_apply_urls(
                self._remove_duplicates(self._prune_urls(job_search_result))
            )
        except Exception as e:
            print(f"Error cleaning job search result: {e}")
            return []
