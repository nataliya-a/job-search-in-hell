import { Link } from "@remix-run/react";
import { useContext, useState } from "react";
import LeverPlaceHolderImage from "~/assets/img/lever-logo-full.svg";
import { Job, JobRowType } from "~/types/general";
import {
  IconExternalLink,
  IconGhostFilled,
  IconChecks,
} from "@tabler/icons-react";
import { JobApplicationModalContext } from "~/routes/_index";

export function JobRow({ job, type }: { job: Job; type: JobRowType }) {
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setJob, modalId } = useContext(JobApplicationModalContext);
  return (
    <>
      <div
        key={job.id}
        // translate shadow x and y
        className="relative border-2 border-black flex flex-row justify-between items-center shadow-[4px_4px_0px_rgba(0,0,0,1)] w-full rounded-xl overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex p-2 flex-row justify-start items-center w-full">
          <div className="flex flex-col justify-center items-center ml-2 w-16 h-16">
            <img
              src={job.image ?? LeverPlaceHolderImage}
              alt={job.company}
              className=" object-contain"
            />
          </div>
          <div className="ml-6">
            {/* check if is less than 24 hrs ago */}
            {new Date(job.created_at).getTime() > Date.now() - 86400000 && (
              <div className="badge bg-red text-white py-2 badge-sm text-xs font-bold">
                Very Fresh
              </div>
            )}

            <h2 className="font-black text-lg flex flex-row">
              {job.company}
              {hovered && type === JobRowType.NEW_JOB && (
                <Link
                  // remove the /apply from the job url
                  to={job.job_url.replace("/apply", "")}
                  target="_blank"
                  className="ml-1 tooltip tooltip-right font-light"
                  data-tip="Job Description"
                  rel="noreferrer"
                >
                  <IconExternalLink size={16} />
                </Link>
              )}
            </h2>
            <p className="font-semibold text-sm">{job.job_title}</p>
          </div>
        </div>

        <div className="flex flex-row  h-full">
          {type === JobRowType.ACTION_REQUIRED && (
            <button
              className={`w-20 bg-black hover:bg-opacity-80 flex flex-col justify-center items-center h-full tooltip tooltip-left hover:cursor-pointer active:bg-opacity-100`}
              data-tip={"Mark as Done"}
              style={{
                visibility: hovered || loading ? "visible" : "hidden",
              }}
              onClick={() => {
                if (!loading) {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                  }, 2000);
                }
              }}
            >
              {loading && (
                <span className="loading loading-spinner loading-md text-white" />
              )}

              {!loading && <IconChecks size={40} color="white" />}
            </button>
          )}
          <button
            className={`w-20 ${
              type === JobRowType.ACTION_REQUIRED ? "bg-warning" : "bg-success"
            }  hover:bg-opacity-80 flex flex-col justify-center items-center h-full tooltip tooltip-left hover:cursor-pointer active:bg-opacity-100`}
            data-tip={
              type === JobRowType.NEW_JOB ? "Magic Apply" : "Manually Apply"
            }
            onClick={async () => {
              // @ts-expect-error Property 'showModal' does not exist on type 'HTMLElement'
              document.getElementById(modalId).showModal();
              await new Promise((resolve) => setTimeout(resolve, 200));
              setJob(job);
            }}
          >
            {loading && type === JobRowType.NEW_JOB && (
              <span className="loading loading-spinner loading-md text-white" />
            )}

            {hovered && !loading && type === JobRowType.NEW_JOB && (
              <IconGhostFilled size={40} color="white" />
            )}
            {hovered && type === JobRowType.ACTION_REQUIRED && (
              <Link to={job.job_url} target="_blank" rel="noreferrer">
                <IconExternalLink size={40} color="white" />
              </Link>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
