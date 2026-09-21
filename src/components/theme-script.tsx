/** Runs before first paint to apply the saved theme, preventing a light→dark flash. Server component on purpose. */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
