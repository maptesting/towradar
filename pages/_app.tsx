// pages/_app.tsx
import "../styles/globals.css";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Ensures session syncing (logout/login updates everywhere)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
