<template>
  <div class="app-container">
    <header class="app-header">
      <!-- Removed main navigation -->
      <div class="admin-link">
        <NuxtLink to="/admin" title="Admin Settings">
          <!-- Simple SVG Cog Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cog-icon">
            <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"></path>
            <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
        </NuxtLink>
      </div>
    </header>
    <main class="app-main">
      <slot /> <!-- Page content will be rendered here -->
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Ensure layout takes full viewport height */
}

.app-header {
  background-color: #f8f9fa; /* Lighter background */
  padding: 8px 15px; /* Adjusted padding */
  border-bottom: 1px solid #dee2e6; /* Slightly darker border */
  display: flex;
  justify-content: flex-end; /* Align items to the right */
  align-items: center;
  height: 50px; /* Fixed header height */
  flex-shrink: 0; /* Prevent header from shrinking */
}

.admin-link a {
  display: inline-block; /* Allows padding/margin */
  color: #495057; /* Darker grey for icon */
  padding: 5px; /* Add some clickable area */
  border-radius: 4px; /* Slightly rounded corners */
}

.admin-link a:hover {
  background-color: #e9ecef; /* Subtle hover background */
  color: #212529; /* Darken icon on hover */
}

.cog-icon {
  width: 20px; /* Slightly smaller icon */
  height: 20px;
  vertical-align: middle; /* Align icon nicely if text were present */
}

.app-main {
  flex-grow: 1; /* Allow main content to fill remaining space */
  overflow-y: auto; /* Add scroll if content overflows */
  /* Removed padding: 20px; - let the page component handle its padding */
}
</style>
