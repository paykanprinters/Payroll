export const AppFooter = () => {
  return (
    <div className="p-4 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Made and built by{" "}
        <a
          href="https://www.digitalfingers.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
        >
          Digital Fingers
        </a>
        {" — "}Your Digital Solution Partner for SaaS
      </p>
    </div>
  );
};
