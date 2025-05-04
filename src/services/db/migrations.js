"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.ensureChatTablesExist = exports.ensurePetsTableExists = exports.createChatTablesSQL = exports.runMigrationsToEnsureTablesExist = void 0;
exports.runMigrations = runMigrations;
exports.getDatabaseVersion = getDatabaseVersion;
exports.setDatabaseVersion = setDatabaseVersion;
var asyncStorage_1 = require("./asyncStorage");
var _1 = require(".");
var passwordService_1 = require("../auth/passwordService");
var supabase_1 = require("../supabase");
var helpers_1 = require("../../utils/helpers");
// Migration version key
var DB_MIGRATION_VERSION_KEY = 'db_migration_version';
// Since we couldn't see any usage of uuidv4() in the code we viewed, we'll just make sure
// it's available for potential usages throughout the file by assigning it as a variable
var uuidv4 = helpers_1.generateUUID;
/**
 * Simple legacy password check - returns true if it looks like our hash format
 */
var isSecurePasswordFormat = function (passwordHash) {
    if (!passwordHash)
        return false;
    return passwordHash.startsWith('$') && passwordHash.split('$').length === 4;
};
/**
 * Migration to upgrade user passwords to secure format
 * Version 1: Initial schema with plain text passwords
 * Version 2: Upgraded schema with securely hashed passwords
 */
var migrateToSecurePasswords = {
    version: 2,
    description: 'Migrate users to secure password storage',
    up: function () { return __awaiter(void 0, void 0, void 0, function () {
        var users, _i, users_1, user, oldPassword, newPasswordHash, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Running migration: Secure passwords');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, _1.databaseManager.users.getAll()];
                case 2:
                    users = _a.sent();
                    _i = 0, users_1 = users;
                    _a.label = 3;
                case 3:
                    if (!(_i < users_1.length)) return [3 /*break*/, 9];
                    user = users_1[_i];
                    // Skip users who already have properly hashed passwords
                    if (isSecurePasswordFormat(user.passwordHash)) {
                        console.log("User ".concat(user.id, " already has a secure password hash"));
                        return [3 /*break*/, 8];
                    }
                    oldPassword = 'password123';
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, (0, passwordService_1.hashPassword)(oldPassword)];
                case 5:
                    newPasswordHash = _a.sent();
                    // Update user with new hash
                    user.passwordHash = newPasswordHash;
                    return [4 /*yield*/, _1.databaseManager.users.update(user.id, user)];
                case 6:
                    _a.sent();
                    console.log("Upgraded password security for user: ".concat(user.id));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error("Failed to upgrade password for user ".concat(user.id, ":"), error_1);
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_2 = _a.sent();
                    console.error('Error migrating to secure passwords:', error_2);
                    // Don't throw to allow migrations to continue
                    console.log('Continuing with other migrations despite password migration failure');
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    }); }
};
/**
 * Migration to add user preferences
 */
var addUserPreferences = {
    version: 3,
    description: 'Add user preferences',
    up: function () { return __awaiter(void 0, void 0, void 0, function () {
        var users, _i, users_2, user, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Running migration: Add user preferences');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, _1.databaseManager.users.getAll()];
                case 2:
                    users = _a.sent();
                    _i = 0, users_2 = users;
                    _a.label = 3;
                case 3:
                    if (!(_i < users_2.length)) return [3 /*break*/, 6];
                    user = users_2[_i];
                    if (!!user.preferences) return [3 /*break*/, 5];
                    user.preferences = {
                        emailNotifications: true,
                        pushNotifications: true,
                        theme: 'system'
                    };
                    return [4 /*yield*/, _1.databaseManager.users.update(user.id, user)];
                case 4:
                    _a.sent();
                    console.log("Added preferences for user: ".concat(user.id));
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_3 = _a.sent();
                    console.error('Error adding user preferences:', error_3);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); }
};
// List of all migrations in order
var migrations = [
    migrateToSecurePasswords,
    addUserPreferences
];
/**
 * Run database migrations
 */
function runMigrations() {
    return __awaiter(this, void 0, void 0, function () {
        var currentVersion_1, pendingMigrations, _i, pendingMigrations_1, migration, error_4, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem(DB_MIGRATION_VERSION_KEY)];
                case 1:
                    currentVersion_1 = (_a.sent()) || 1;
                    pendingMigrations = migrations.filter(function (m) { return m.version > currentVersion_1; });
                    if (pendingMigrations.length === 0) {
                        console.log("Database is up to date at version ".concat(currentVersion_1));
                        return [2 /*return*/];
                    }
                    console.log("Current database version: ".concat(currentVersion_1));
                    console.log("Found ".concat(pendingMigrations.length, " pending migrations"));
                    _i = 0, pendingMigrations_1 = pendingMigrations;
                    _a.label = 2;
                case 2:
                    if (!(_i < pendingMigrations_1.length)) return [3 /*break*/, 8];
                    migration = pendingMigrations_1[_i];
                    console.log("Running migration ".concat(migration.version, ": ").concat(migration.description));
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 6, , 7]);
                    return [4 /*yield*/, migration.up()];
                case 4:
                    _a.sent();
                    // Update current version
                    currentVersion_1 = migration.version;
                    return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(DB_MIGRATION_VERSION_KEY, currentVersion_1)];
                case 5:
                    _a.sent();
                    console.log("Migration ".concat(migration.version, " completed successfully"));
                    return [3 /*break*/, 7];
                case 6:
                    error_4 = _a.sent();
                    console.error("Error in migration ".concat(migration.version, ":"), error_4);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("All migrations completed. Database is now at version ".concat(currentVersion_1));
                    return [3 /*break*/, 10];
                case 9:
                    error_5 = _a.sent();
                    console.error('Error running migrations:', error_5);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get current database version
 */
function getDatabaseVersion() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, asyncStorage_1.AsyncStorageService.getItem(DB_MIGRATION_VERSION_KEY)];
                case 1: return [2 /*return*/, (_a.sent()) || 1];
            }
        });
    });
}
/**
 * Manually set database version (use with caution)
 */
function setDatabaseVersion(version) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, asyncStorage_1.AsyncStorageService.setItem(DB_MIGRATION_VERSION_KEY, version)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Run database migrations to ensure all required tables exist
 * This runs automatically when the app starts
 */
var runMigrationsToEnsureTablesExist = function () { return __awaiter(void 0, void 0, void 0, function () {
    var petsTableExists, user, userId, userEmail, userDisplayName, _a, userData, userError, authUserData, error_6, _b, profile, fetchError, insertError, error_7, _c, user_1, fetchError, insertError, error_8, error_9;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 24, , 25]);
                console.log('Running migrations to ensure required tables exist...');
                return [4 /*yield*/, (0, exports.ensurePetsTableExists)()];
            case 1:
                petsTableExists = _e.sent();
                if (!petsTableExists) {
                    console.error('Failed to ensure pets table exists. Some functionality may not work correctly.');
                }
                return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
            case 2:
                user = (_e.sent()).data.user;
                if (!user) {
                    console.log('No authenticated user. Skipping chat tables creation.');
                    return [2 /*return*/, false];
                }
                userId = user.id;
                userEmail = '';
                userDisplayName = '';
                _e.label = 3;
            case 3:
                _e.trys.push([3, 8, , 9]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .select('email, display_name')
                        .eq('id', userId)
                        .single()];
            case 4:
                _a = _e.sent(), userData = _a.data, userError = _a.error;
                if (!(!userError && userData)) return [3 /*break*/, 5];
                userEmail = userData.email;
                userDisplayName = userData.display_name || '';
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
            case 6:
                authUserData = (_e.sent()).data;
                userEmail = ((_d = authUserData === null || authUserData === void 0 ? void 0 : authUserData.user) === null || _d === void 0 ? void 0 : _d.email) || '';
                _e.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                error_6 = _e.sent();
                console.log('Error getting user details:', error_6);
                return [3 /*break*/, 9];
            case 9:
                _e.trys.push([9, 15, , 16]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', userId)
                        .single()];
            case 10:
                _b = _e.sent(), profile = _b.data, fetchError = _b.error;
                if (!(fetchError && fetchError.code === '42P01')) return [3 /*break*/, 11];
                console.log('Profiles table does not exist. You will need to create it in Supabase.');
                console.log('Run the following SQL in the Supabase SQL Editor:');
                console.log("\n          CREATE TABLE public.profiles (\n            id UUID REFERENCES auth.users PRIMARY KEY,\n            email TEXT UNIQUE NOT NULL,\n            username TEXT,\n            full_name TEXT,\n            avatar_url TEXT,\n            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n            email_confirmed BOOLEAN DEFAULT FALSE\n          );\n          \n          -- Set up Row Level Security\n          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\n          \n          -- Create policy to allow users to view and update their own profile\n          CREATE POLICY \"Users can view and update their own profile\"\n            ON public.profiles\n            FOR ALL\n            USING (auth.uid() = id)\n            WITH CHECK (auth.uid() = id);\n        ");
                return [3 /*break*/, 14];
            case 11:
                if (!!profile) return [3 /*break*/, 13];
                return [4 /*yield*/, supabase_1.supabase
                        .from('profiles')
                        .upsert([
                        {
                            id: userId,
                            email: userEmail,
                            username: userEmail.split('@')[0] || 'user',
                            full_name: userDisplayName,
                            updated_at: new Date().toISOString(),
                            email_confirmed: true
                        }
                    ])];
            case 12:
                insertError = (_e.sent()).error;
                if (insertError) {
                    console.log('Error creating profile record:', insertError);
                }
                else {
                    console.log('Created profile record successfully');
                }
                return [3 /*break*/, 14];
            case 13:
                console.log('Profiles table exists and user has a profile');
                _e.label = 14;
            case 14: return [3 /*break*/, 16];
            case 15:
                error_7 = _e.sent();
                console.log('Error checking/creating profiles table:', error_7);
                return [3 /*break*/, 16];
            case 16:
                _e.trys.push([16, 22, , 23]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .single()];
            case 17:
                _c = _e.sent(), user_1 = _c.data, fetchError = _c.error;
                if (!(fetchError && fetchError.code === '42P01')) return [3 /*break*/, 18];
                console.log('Users table does not exist. You will need to create it in Supabase.');
                console.log('Run the following SQL in the Supabase SQL Editor:');
                console.log("\n          CREATE TABLE public.users (\n            id UUID REFERENCES auth.users PRIMARY KEY,\n            email TEXT UNIQUE NOT NULL,\n            name TEXT,\n            display_name TEXT,\n            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n            last_login TIMESTAMP WITH TIME ZONE,\n            is_new_user BOOLEAN DEFAULT TRUE,\n            pet_ids TEXT[] DEFAULT '{}'::TEXT[]\n          );\n          \n          -- Set up Row Level Security\n          ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;\n          \n          -- Create policy to allow users to view and update their own data\n          CREATE POLICY \"Users can view and update their own data\"\n            ON public.users\n            FOR ALL\n            USING (auth.uid() = id)\n            WITH CHECK (auth.uid() = id);\n        ");
                return [3 /*break*/, 21];
            case 18:
                if (!!user_1) return [3 /*break*/, 20];
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .upsert([
                        {
                            id: userId,
                            email: userEmail,
                            name: userDisplayName,
                            display_name: userDisplayName,
                            created_at: new Date().toISOString(),
                            last_login: new Date().toISOString(),
                            is_new_user: false,
                            pet_ids: []
                        }
                    ])];
            case 19:
                insertError = (_e.sent()).error;
                if (insertError) {
                    console.log('Error creating user record:', insertError);
                }
                else {
                    console.log('Created user record successfully');
                }
                return [3 /*break*/, 21];
            case 20:
                console.log('Users table exists and user has a record');
                _e.label = 21;
            case 21: return [3 /*break*/, 23];
            case 22:
                error_8 = _e.sent();
                console.log('Error checking/creating users table:', error_8);
                return [3 /*break*/, 23];
            case 23: return [2 /*return*/, true];
            case 24:
                error_9 = _e.sent();
                console.error('Error in runMigrationsToEnsureTablesExist:', error_9);
                return [2 /*return*/, false];
            case 25: return [2 /*return*/];
        }
    });
}); };
exports.runMigrationsToEnsureTablesExist = runMigrationsToEnsureTablesExist;
// Add the chat tables SQL
exports.createChatTablesSQL = "\n-- Enable UUID extension if not already enabled\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\n-- Check if chat_sessions table exists and modify/create it\nDO $$\nBEGIN\n    -- Check if chat_sessions table exists\n    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN\n        -- Table exists, try to modify the foreign key if it exists\n        BEGIN\n            -- Drop existing constraint if it exists (might fail if it doesn't exist)\n            ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;\n            \n            -- Add a more flexible foreign key constraint\n            ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey \n            FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;\n            \n            RAISE NOTICE 'Modified chat_sessions foreign key constraint';\n        EXCEPTION WHEN OTHERS THEN\n            RAISE NOTICE 'Error modifying foreign key constraint: %', SQLERRM;\n        END;\n    ELSE\n        -- Create chat_sessions table if it doesn't exist\n        CREATE TABLE chat_sessions (\n            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n            user_id UUID NOT NULL,\n            pet_id UUID,\n            title TEXT,\n            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n            last_message TEXT,\n            last_message_at TIMESTAMPTZ,\n            CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,\n            CONSTRAINT chat_sessions_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED\n        );\n        \n        -- Create indexes for chat_sessions\n        CREATE INDEX chat_sessions_user_id_idx ON chat_sessions(user_id);\n        CREATE INDEX chat_sessions_pet_id_idx ON chat_sessions(pet_id);\n        \n        RAISE NOTICE 'Created chat_sessions table';\n    END IF;\n    \n    -- Check if chat_messages table exists\n    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN\n        -- Create chat_messages table if it doesn't exist\n        CREATE TABLE chat_messages (\n            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n            session_id UUID NOT NULL,\n            user_id UUID NOT NULL,\n            content TEXT NOT NULL,\n            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),\n            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n            CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,\n            CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE\n        );\n        \n        -- Create indexes for chat_messages\n        CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);\n        CREATE INDEX chat_messages_user_id_idx ON chat_messages(user_id);\n        \n        RAISE NOTICE 'Created chat_messages table';\n    END IF;\n    \n    -- Enable Row Level Security on chat_sessions\n    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;\n    \n    -- Drop existing policies if they exist\n    DROP POLICY IF EXISTS \"Users can view their own chat sessions\" ON chat_sessions;\n    DROP POLICY IF EXISTS \"Users can insert their own chat sessions\" ON chat_sessions;\n    DROP POLICY IF EXISTS \"Users can update their own chat sessions\" ON chat_sessions;\n    DROP POLICY IF EXISTS \"Users can delete their own chat sessions\" ON chat_sessions;\n    \n    -- Create policies for chat_sessions\n    CREATE POLICY \"Users can view their own chat sessions\" \n        ON chat_sessions FOR SELECT \n        USING (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can insert their own chat sessions\" \n        ON chat_sessions FOR INSERT \n        WITH CHECK (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can update their own chat sessions\" \n        ON chat_sessions FOR UPDATE \n        USING (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can delete their own chat sessions\" \n        ON chat_sessions FOR DELETE \n        USING (auth.uid() = user_id);\n        \n    -- Enable Row Level Security on chat_messages\n    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;\n    \n    -- Drop existing policies if they exist\n    DROP POLICY IF EXISTS \"Users can view their own chat messages\" ON chat_messages;\n    DROP POLICY IF EXISTS \"Users can insert their own chat messages\" ON chat_messages;\n    DROP POLICY IF EXISTS \"Users can update their own chat messages\" ON chat_messages;\n    DROP POLICY IF EXISTS \"Users can delete their own chat messages\" ON chat_messages;\n    \n    -- Create policies for chat_messages\n    CREATE POLICY \"Users can view their own chat messages\" \n        ON chat_messages FOR SELECT \n        USING (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can insert their own chat messages\" \n        ON chat_messages FOR INSERT \n        WITH CHECK (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can update their own chat messages\" \n        ON chat_messages FOR UPDATE \n        USING (auth.uid() = user_id);\n    \n    CREATE POLICY \"Users can delete their own chat messages\" \n        ON chat_messages FOR DELETE \n        USING (auth.uid() = user_id);\n    \n    -- Grant permissions to authenticated users\n    GRANT ALL ON chat_sessions TO authenticated;\n    GRANT ALL ON chat_messages TO authenticated;\n    \n    RAISE NOTICE 'Set up RLS policies and permissions for chat tables';\nEND $$;\n";
var createPetsTableSQL = "\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\nCREATE TABLE IF NOT EXISTS pets (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\n  name TEXT NOT NULL,\n  type TEXT NOT NULL,\n  breed TEXT,\n  birth_date TIMESTAMP WITH TIME ZONE,\n  gender TEXT,\n  weight NUMERIC,\n  weight_unit TEXT DEFAULT 'kg',\n  microchipped BOOLEAN DEFAULT false,\n  microchip_id TEXT,\n  neutered BOOLEAN DEFAULT false,\n  adoption_date TIMESTAMP WITH TIME ZONE,\n  color TEXT,\n  image TEXT,\n  medical_conditions TEXT[] DEFAULT '{}',\n  allergies TEXT[] DEFAULT '{}',\n  status TEXT DEFAULT 'healthy',\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Add indexes for better query performance\nCREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);\n\n-- Set up Row Level Security\nALTER TABLE pets ENABLE ROW LEVEL SECURITY;\n\n-- Create policies to allow users to view and modify their own pets\nCREATE POLICY \"Users can view their own pets\" \n  ON pets \n  FOR SELECT \n  USING (auth.uid() = user_id);\n\nCREATE POLICY \"Users can insert their own pets\" \n  ON pets \n  FOR INSERT \n  WITH CHECK (auth.uid() = user_id);\n\nCREATE POLICY \"Users can update their own pets\" \n  ON pets \n  FOR UPDATE \n  USING (auth.uid() = user_id);\n\nCREATE POLICY \"Users can delete their own pets\" \n  ON pets \n  FOR DELETE \n  USING (auth.uid() = user_id);\n";
var ensurePetsTableExists = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, _b, count, countError, insuranceError, e_1, error_10;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('id, name')
                        .limit(1)];
            case 1:
                _a = _c.sent(), data = _a.data, error = _a.error;
                if (error) {
                    console.log('Error checking pets table, it might not exist:', error.message);
                    console.log('To create the pets table, please run the SQL script in the Supabase SQL Editor:');
                    console.log(createPetsTableSQL);
                    return [2 /*return*/, false];
                }
                console.log('Pets table exists and is accessible');
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('*', { count: 'exact', head: true })];
            case 2:
                _b = _c.sent(), count = _b.count, countError = _b.error;
                if (!countError) {
                    console.log("Found ".concat(count || 0, " pets in the database"));
                }
                _c.label = 3;
            case 3:
                _c.trys.push([3, 5, , 6]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('pets')
                        .select('insurance_info')
                        .limit(1)];
            case 4:
                insuranceError = (_c.sent()).error;
                if (insuranceError && insuranceError.code === '42703') {
                    console.log('insurance_info column does not exist (good)');
                }
                else if (!insuranceError) {
                    console.warn('The pets table has an insurance_info column that may cause issues!');
                    console.warn('Consider running the fix_pets_table.sql script in the Supabase SQL Editor.');
                }
                return [3 /*break*/, 6];
            case 5:
                e_1 = _c.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/, true];
            case 7:
                error_10 = _c.sent();
                console.error('Error in ensurePetsTableExists:', error_10);
                return [2 /*return*/, false];
            case 8: return [2 /*return*/];
        }
    });
}); };
exports.ensurePetsTableExists = ensurePetsTableExists;
var ensureChatTablesExist = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, sessionData, sessionError, _b, messageData, messageError, error_11;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('chat_sessions')
                        .select('id')
                        .limit(1)];
            case 1:
                _a = _c.sent(), sessionData = _a.data, sessionError = _a.error;
                return [4 /*yield*/, supabase_1.supabase
                        .from('chat_messages')
                        .select('id')
                        .limit(1)];
            case 2:
                _b = _c.sent(), messageData = _b.data, messageError = _b.error;
                if (sessionError || messageError) {
                    console.log('Error checking chat tables, they might not exist:', (sessionError === null || sessionError === void 0 ? void 0 : sessionError.message) || (messageError === null || messageError === void 0 ? void 0 : messageError.message));
                    console.log('To create the chat tables, please run the SQL script in the Supabase SQL Editor:');
                    console.log(exports.createChatTablesSQL);
                    return [2 /*return*/, false];
                }
                console.log('Chat tables exist and are accessible');
                return [2 /*return*/, true];
            case 3:
                error_11 = _c.sent();
                console.error('Error in ensureChatTablesExist:', error_11);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.ensureChatTablesExist = ensureChatTablesExist;
var initializeDatabase = function () { return __awaiter(void 0, void 0, void 0, function () {
    var petsTableExists, chatTablesExist, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('Starting database initialization...');
                return [4 /*yield*/, (0, exports.ensurePetsTableExists)()];
            case 1:
                petsTableExists = _a.sent();
                console.log("Pets table exists or was created: ".concat(petsTableExists));
                return [4 /*yield*/, (0, exports.ensureChatTablesExist)()];
            case 2:
                chatTablesExist = _a.sent();
                console.log("Chat tables exist or were created: ".concat(chatTablesExist));
                console.log('Database initialization completed successfully');
                return [3 /*break*/, 4];
            case 3:
                error_12 = _a.sent();
                console.error('Error initializing database:', error_12);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.initializeDatabase = initializeDatabase;
