import { getAuth } from "@clerk/remix/ssr.server";
import { json, LoaderFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import JobStatusBoard from "~/components/applications/JobStatusBoard";
import GeneralDashboardLayout from "~/components/GeneralDashboardLayout";
import { JobExtended, SideBarType } from "~/types/general";

export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) return json([]);

  const supabase = args.context.supabase();
  const userApplications = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId);
  if (!userApplications.data) return json([]);
  const appiledJobsDetails = await supabase
    .from("jobs")
    .select("*")
    .in(
      "job_url",
      userApplications.data.map((app) => app.job_url)
    );
  const response = [] as JobExtended[];
  response.push(
    ...(appiledJobsDetails.data?.map((job) => {
      return {
        ...job,
        applied: true,
      };
    }) ?? [])
  );
  return json(response);
};

export default function DashboardApplications() {
  const appliedJobs = useLoaderData() as JobExtended[];
  return (
    <GeneralDashboardLayout sidebarType={SideBarType.APPLICATIONS}>
      <JobStatusBoard jobs={appliedJobs} />
    </GeneralDashboardLayout>
  );
}
