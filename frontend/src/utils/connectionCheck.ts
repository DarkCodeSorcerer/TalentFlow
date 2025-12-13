import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function checkBackendConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    // Use direct axios call for health check (no auth needed)
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 3000,
      validateStatus: () => true // Accept any status to check if server responds
    });
    
    if (response.status === 200 && response.data?.status === "ok") {
      return { connected: true, message: "✅ Backend is connected" };
    }
    return { 
      connected: false, 
      message: `Backend responded but health check failed (status: ${response.status})` 
    };
  } catch (error: any) {
    const errorCode = error.code || error.message;
    
    if (errorCode === "ERR_NETWORK" || errorCode === "ECONNREFUSED" || error.message?.includes("Network Error") || error.message?.includes("connect ECONNREFUSED")) {
      return {
        connected: false,
        message: `Backend server is not running at ${API_URL}. Please start it with: cd backend && bun run src/index.ts`
      };
    }
    
    if (errorCode === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        connected: false,
        message: `Backend at ${API_URL} is not responding (timeout). Server may be slow or not running.`
      };
    }
    
    return {
      connected: false,
      message: `Connection error: ${error.message || "Unknown error"}`
    };
  }
}

