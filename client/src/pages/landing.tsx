import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to welcome page immediately
    setLocation("/welcome");
  }, [setLocation]);

  return null;
}