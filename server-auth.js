import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { my } from "./server-stores.js";

const COOKIE_NAME="campus_session";
const SESSION_DAYS=7;
function cookieOptions() {
  return {httpOnly:true,secure:process.env.COOKIE_SECURE==="true",sameSite:"lax",path:"/",maxAge:SESSION_DAYS*24*60*60*1000};
}
export async function attachSession(res,userId) {
  const jti=randomUUID();
  const token=jwt.sign({sub:userId,jti},process.env.JWT_SECRET,{expiresIn:SESSION_DAYS+"d",issuer:"campus-helpdesk"});
  const expires=new Date(Date.now()+SESSION_DAYS*86400000);
  await my.execute("INSERT INTO user_sessions (jti,user_id,expires_at) VALUES (?,?,?)",[jti,userId,expires]);
  res.cookie(COOKIE_NAME,token,cookieOptions());
}
export async function resolveUser(req) {
  const token=req.cookies&&req.cookies[COOKIE_NAME];
  if(!token) return null;
  let claims;
  try { claims=jwt.verify(token,process.env.JWT_SECRET,{issuer:"campus-helpdesk"}); }
  catch { return null; }
  const [rows]=await my.execute(
    "SELECT u.id,u.name,u.email,u.role,u.active,u.created_at FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.jti=? AND s.expires_at>NOW() AND u.active=TRUE LIMIT 1",
    [claims.jti]
  );
  if(!rows[0]||rows[0].id!==claims.sub) return null;
  return {id:rows[0].id,name:rows[0].name,email:rows[0].email,role:rows[0].role};
}
export async function authenticate(req,res,next) {
  const user=await resolveUser(req);
  if(!user) return res.status(401).json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}});
  req.user=user;
  req.sessionToken=req.cookies[COOKIE_NAME];
  next();
}
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME,{httpOnly:true,secure:process.env.COOKIE_SECURE==="true",sameSite:"lax",path:"/"});
}
export async function revokeSession(token) {
  if(!token) return;
  try {
    const claims=jwt.verify(token,process.env.JWT_SECRET,{issuer:"campus-helpdesk"});
    await my.execute("DELETE FROM user_sessions WHERE jti=?",[claims.jti]);
  } catch { /* Invalid and expired tokens have no active session to revoke. */ }
}
export function authorize(roles) {
  return function(req,res,next) {
    if(!req.user||!roles.includes(req.user.role)) return res.status(403).json({error:{code:"FORBIDDEN",message:"Your role cannot perform this action."}});
    next();
  };
}
export async function verifyPassword(email,password) {
  const [rows]=await my.execute("SELECT id,name,email,password_hash,role,active,created_at FROM users WHERE email=? LIMIT 1",[email.toLowerCase().trim()]);
  const user=rows[0];
  if(!user||!user.active||!(await bcrypt.compare(password,user.password_hash))) return null;
  return user;
}
export async function createRequester({name,email,password}) {
  const normalizedEmail=email.toLowerCase().trim();
  const [existing]=await my.execute("SELECT id FROM users WHERE email=? LIMIT 1",[normalizedEmail]);
  if(existing.length) throw Object.assign(new Error("An account with this email already exists."),{status:409,code:"EMAIL_EXISTS"});
  const id=randomUUID();
  const hash=await bcrypt.hash(password,12);
  try { await my.execute("INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,'requester')",[id,name.trim(),normalizedEmail,hash]); }
  catch(error) { if(error.code==="ER_DUP_ENTRY") throw Object.assign(new Error("An account with this email already exists."),{status:409,code:"EMAIL_EXISTS"}); throw error; }
  const [rows]=await my.execute("SELECT id,name,email,role,active,created_at FROM users WHERE id=?",[id]);
  return rows[0];
}
export { COOKIE_NAME };
