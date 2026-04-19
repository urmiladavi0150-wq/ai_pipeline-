import { Job, JobInput, JobStatus, JobResult } from "@/types";
import { supabase } from "./supabase";

export async function createJob(input: JobInput): Promise<string> {
  const now = Date.now();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      status: "queued",
      input: input,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Supabase createJob error: ${error.message}`);
  }
  if (!data || !data.id) {
    throw new Error("Supabase createJob did not return an ID.");
  }
  return data.id;
}

export async function updateJob(
  id: string,
  update: Partial<Pick<Job, "status" | "result" | "error">>
): Promise<void> {
  const now = Date.now();
  const { error } = await supabase
    .from("jobs")
    .update({ ...update, updatedAt: now })
    .eq("id", id);

  if (error) {
    throw new Error(`Supabase updateJob error: ${error.message}`);
  }
}

export async function getJob(id: string): Promise<Job | undefined> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const code = typeof error.code === "string" ? error.code : String(error.code);
    if (code !== "PGRST116" && !/no rows/i.test(error.message || "")) {
      throw new Error(`Supabase getJob error: ${error.message}`);
    }
    return undefined;
  }

  if (!data) {
    return undefined;
  }

  // Supabase returns JSONB columns as objects, ensure types match Job interface
  return {
    id: data.id,
    status: data.status as JobStatus,
    input: data.input as JobInput,
    result: data.result as JobResult | null,
    error: data.error as string | null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function pruneJobs(maxAgeMs: number = 3_600_000): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  const { error } = await supabase
    .from("jobs")
    .delete()
    .lt("createdAt", cutoff);

  if (error) {
    console.error(`Supabase pruneJobs error: ${error.message}`);
  }
}
