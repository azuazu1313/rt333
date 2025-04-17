{
  // Update the user menu in Header.tsx to include Admin Portal link for admin users
  const existingContent = await readFile('src/components/Header.tsx');
  const updatedContent = existingContent.replace(
    '<Link \n                        to="/profile"',
    `{userData?.role === 'admin' && (
                        <Link 
                          to="/admin" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Admin Portal
                        </Link>
                      )}
                      <Link \n                        to="/profile"`
  );
  return updatedContent;
}