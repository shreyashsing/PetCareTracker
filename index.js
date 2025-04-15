/**
 * @format
 */

// This is the first file that is run when the app starts
// Import any polyfills or shims needed for the application

// Import the registerRootComponent function from Expo
import { registerRootComponent } from 'expo';

// Import our App component
import App from './App';

// Register the App component with Expo
// This makes it the root component of the app
registerRootComponent(App); 