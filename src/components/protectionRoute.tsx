// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { getCalibration } from "../scripts/calibration";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const calib = getCalibration();
  const loc = useLocation();
  if (!calib) return <Navigate to="/calibration" replace state={{ next: loc.pathname }} />;
  return children;
}
