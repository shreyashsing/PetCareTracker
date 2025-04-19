// Test file to ensure module declarations are working
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/AppStore';
import { usePetStore } from '../store/PetStore';
import { useErrorReporting } from '../utils/error-reporting';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { GiftedChat } from 'react-native-gifted-chat';

// This is just to test if the module declarations are working
// Will never be executed
const testModuleDeclarations = () => {
  const theme = useTheme();
  const appStore = useAppStore();
  const petStore = usePetStore();
  const errorReporting = useErrorReporting();

  console.log(theme.colors.primary);
  console.log(appStore.isLoading);
  console.log(petStore.activePet);
  errorReporting.reportError(new Error('Test error'));

  Toast.show({
    type: 'success',
    text1: 'Hello',
    text2: 'This is a test'
  });

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const messages = GiftedChat.append([], [{
    _id: 1,
    text: 'Hello',
    createdAt: new Date(),
    user: {
      _id: 1,
      name: 'Test'
    }
  }]);

  console.log(messages);
};

export default testModuleDeclarations; 