import dotenv from "dotenv";

dotenv.config();

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value: string | undefined): string | string[] => {
  if (!value || value.trim() === "") return "*";
  const origins = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
};

const PORT = parsePort(process.env.PORT, 5000);
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/ats";
const JWT_SECRET = process.env.JWT_SECRET ?? "your_jwt_secret";
const CORS_ORIGIN = parseOrigins(process.env.CORS_ORIGIN);

export const env = { PORT, MONGO_URI, JWT_SECRET, CORS_ORIGIN };

export { PORT, MONGO_URI, JWT_SECRET, CORS_ORIGIN };


