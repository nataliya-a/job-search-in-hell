import { ActionFunction } from "@remix-run/cloudflare";
import { API_Actions } from "~/types/api";

export const action: ActionFunction = async (args) => {
  const supabase = args.context.supabase();

  const formData = await args.request.formData();
  console.log("formData", formData);
  if (!formData || !formData.get("action"))
    return new Response("No form data", { status: 400 });
  switch (formData.get("action")) {
    case API_Actions.MARK_AS_APPLIED: {
      const jobUrl = formData.get("jobUrl");
      const userId = formData.get("userId");
      if (!jobUrl || !userId)
        return new Response("Missing jobUrl or userId", { status: 400 });
      try {
        await supabase.from("applications").upsert({
          job_url: jobUrl.toString(),
          user_id: userId.toString(),
          applied: true,
        });
        return new Response("Applied to job", { status: 200 });
      } catch (error) {
        console.error("Error applying to job", error);
        return new Response("Failed to apply to job", { status: 500 });
      }
    }
    default:
      return new Response("Invalid action", { status: 400 });
  }
};
