import { Outlet } from "react-router-dom";

function SiteLayout() {
  return (
    <>
      <header>
        <p>Header</p>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>Footer</p>
      </footer>
    </>
  );
}

export default SiteLayout;
