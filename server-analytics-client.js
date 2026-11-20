export async function loadAnalytics(user) {
  const endpoint = new URL("/summary", process.env.ANALYTICS_URL);
  endpoint.searchParams.set("userId", user.id);
  endpoint.searchParams.set("role", user.role);
  let response;
  try {
    response = await fetch(endpoint, {
      headers: { "x-internal-token": process.env.ANALYTICS_TOKEN },
      signal: AbortSignal.timeout(6000)
    });
  } catch (error) {
    throw Object.assign(new Error("Analytics service is unavailable. Retry in a moment."), { status:503, code:"ANALYTICS_UNAVAILABLE", cause:error });
  }
  if (!response.ok) throw Object.assign(new Error("Analytics service could not load this view."), { status:503, code:"ANALYTICS_UNAVAILABLE" });
  return response.json();
}
