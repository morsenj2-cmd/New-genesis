import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Morse` : "Morse - AI-Powered Design Tool for Unique Interfaces";
    return () => { document.title = prev; };
  }, [title]);
}
