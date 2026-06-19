import { AlertCircle } from "lucide-react";

export default function DeploymentConfigError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <h1 className="text-lg font-semibold">Deployment configuration required</h1>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            In{" "}
            <a
              href="https://vercel.com/docs/projects/environment-variables"
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              Vercel → Project → Settings → Environment Variables
            </a>
            , add <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">VITE_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>Enable them for <strong>Production</strong> and <strong>Preview</strong>.</li>
          <li>Redeploy the project (Deployments → … → Redeploy).</li>
        </ol>
      </div>
    </div>
  );
}
