from flask import Flask, request, Response
import logging
from config.queries import COMPREHENSIVE_SOFTWARE_ENGINEER_QUERY
from utils.database import SupabaseClient
from utils.engine import (
    TBS,
    JobSite,
    find_jobs,
    handle_job_insert,
)
from utils.validator import new_validator
import os
from dotenv import load_dotenv
from http import HTTPStatus

load_dotenv()

MERGENT_API_KEY = os.getenv("MERGENT_API_KEY")


logging.basicConfig(level=logging.INFO)


app = Flask(__name__)


@app.route("/api/mergent/tasks", methods=["POST"])
def mergent_task_handler():
    try:
        validator = new_validator(MERGENT_API_KEY)
        validated, response = validator(request)
        validated = True
        if not validated:
            logging.error(f"Failed to validate request: {response.response}")
            return response

        perform_task(request.data.decode())
    except Exception as e:
        error_message = f"Failed to perform task: {str(e)}"
        logging.error(error_message)
        return Response(error_message, status=HTTPStatus.INTERNAL_SERVER_ERROR)

    return Response(status=HTTPStatus.OK)


def perform_task(body):
    job_urls_by_board = find_jobs(
        COMPREHENSIVE_SOFTWARE_ENGINEER_QUERY,
        [
            JobSite.LEVER, 
            JobSite.GREENHOUSE, 
            JobSite.ASHBY, 
            JobSite.JOBVITE, 
            JobSite.WORKABLE, 
            JobSite.BREEZY, 
            JobSite.APPLYTOJOB, 
            JobSite.BAMBOOHR
        ],
        TBS.PAST_TWELVE_HOURS,
        200,
    )
    try:
        supabase_client = SupabaseClient()
        for job_board, job_urls in job_urls_by_board.items():
            handle_job_insert(supabase_client, job_urls, job_board)
        supabase_client.prune_jobs()
    except Exception as e:
        logging.error(f"Failed: {str(e)}")
