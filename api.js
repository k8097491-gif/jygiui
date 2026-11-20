export class ApiError extends Error {
  constructor(message,status,code,details){super(message);this.name="ApiError";this.status=status;this.code=code;this.details=details;}
}
export async function api(path,options={}) {
  const headers=new Headers(options.headers||{});
  if(options.body!==undefined) headers.set("Content-Type","application/json");
  let response;
  try {
    response=await fetch(path,{...options,headers,credentials:"same-origin",body:options.body===undefined?undefined:JSON.stringify(options.body)});
  } catch {
    throw new ApiError("Could not reach the service. Check your connection and retry.",0,"NETWORK_ERROR");
  }
  if(response.status===204)return null;
  let body={};
  try { body=await response.json(); } catch { /* A non-JSON response is reported by the status handler below. */ }
  if(!response.ok) {
    const error=body.error||{};
    throw new ApiError(error.message||"The request could not be completed.",response.status,error.code||"REQUEST_FAILED",error.details);
  }
  return body;
}
