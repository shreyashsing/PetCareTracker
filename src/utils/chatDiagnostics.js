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
exports.fixTitleColumnIssue = exports.diagnoseChatTables = exports.getChatTablesSQLFix = void 0;
var supabase_1 = require("../services/supabase");
/**
 * Gets the SQL needed to create the chat tables properly
 * This is a specialized function to provide SQL for fixing chat tables
 * with proper foreign key constraints
 */
var getChatTablesSQLFix = function () {
    return "\n/* \n * Chat System Tables Fix\n * This script fixes issues with the chat tables, particularly foreign key constraints\n */\n\n-- Create UUID extension if not exists\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\n-- Force refresh the schema cache\nANALYZE;\n\n-- Check if chat_sessions table exists and fix or create it\nDO $$\nBEGIN\n  -- If chat_sessions table doesn't exist, create it\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.tables \n    WHERE table_schema = 'public' AND table_name = 'chat_sessions'\n  ) THEN\n    CREATE TABLE chat_sessions (\n      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n      user_id UUID NOT NULL,\n      name TEXT,\n      pet_id UUID NULL, -- Making pet_id nullable to avoid foreign key issues\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n    );\n    \n    -- Add indexes\n    CREATE INDEX chat_sessions_user_id_idx ON chat_sessions(user_id);\n    CREATE INDEX chat_sessions_pet_id_idx ON chat_sessions(pet_id);\n    \n    -- Setup Row Level Security\n    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;\n    \n    -- Create policy\n    CREATE POLICY chat_sessions_user_policy ON chat_sessions\n      USING (auth.uid() = user_id)\n      WITH CHECK (auth.uid() = user_id);\n      \n    RAISE NOTICE 'Created chat_sessions table with nullable pet_id column';\n  ELSE\n    -- Table exists, check if pet_id is already nullable\n    IF EXISTS (\n      SELECT 1 FROM information_schema.columns \n      WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n      AND column_name = 'pet_id' AND is_nullable = 'NO'\n    ) THEN\n      -- Make pet_id nullable\n      ALTER TABLE chat_sessions \n      ALTER COLUMN pet_id DROP NOT NULL;\n      \n      RAISE NOTICE 'Modified chat_sessions table to make pet_id nullable';\n    ELSE\n      RAISE NOTICE 'chat_sessions table exists and pet_id is already nullable';\n    END IF;\n    \n    -- Check for title column issue\n    IF EXISTS (\n      SELECT 1 FROM information_schema.columns \n      WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n      AND column_name = 'title'\n    ) THEN\n      -- Check if name column exists\n      IF EXISTS (\n        SELECT 1 FROM information_schema.columns \n        WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n        AND column_name = 'name'\n      ) THEN\n        -- Both columns exist, migrate data and drop title\n        UPDATE chat_sessions \n        SET name = title \n        WHERE name IS NULL AND title IS NOT NULL;\n        \n        ALTER TABLE chat_sessions DROP COLUMN title;\n        RAISE NOTICE 'Merged title column into name column and dropped title';\n      ELSE\n        -- Only title exists, rename to name\n        ALTER TABLE chat_sessions RENAME COLUMN title TO name;\n        RAISE NOTICE 'Renamed title column to name';\n      END IF;\n    ELSE\n      -- Check if name column exists\n      IF NOT EXISTS (\n        SELECT 1 FROM information_schema.columns \n        WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n        AND column_name = 'name'\n      ) THEN\n        -- Neither column exists, add name\n        ALTER TABLE chat_sessions ADD COLUMN name TEXT;\n        RAISE NOTICE 'Added missing name column';\n      END IF;\n    END IF;\n  END IF;\nEND\n$$;\n\n-- Check if chat_messages table exists and fix or create it\nDO $$\nBEGIN\n  -- If chat_messages table doesn't exist, create it\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.tables \n    WHERE table_schema = 'public' AND table_name = 'chat_messages'\n  ) THEN\n    CREATE TABLE chat_messages (\n      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n      session_id UUID NOT NULL,\n      content TEXT NOT NULL,\n      role TEXT NOT NULL,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n    );\n    \n    -- Add index\n    CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);\n    \n    -- Setup Row Level Security\n    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;\n    \n    -- Create policy\n    CREATE POLICY chat_messages_user_policy ON chat_messages\n      USING (EXISTS (\n        SELECT 1 FROM chat_sessions\n        WHERE chat_sessions.id = chat_messages.session_id\n        AND chat_sessions.user_id = auth.uid()\n      ))\n      WITH CHECK (EXISTS (\n        SELECT 1 FROM chat_sessions\n        WHERE chat_sessions.id = chat_messages.session_id\n        AND chat_sessions.user_id = auth.uid()\n      ));\n      \n    RAISE NOTICE 'Created chat_messages table';\n  ELSE\n    RAISE NOTICE 'chat_messages table already exists';\n  END IF;\nEND\n$$;\n\n-- Fix or create foreign key constraints\nDO $$\nBEGIN\n  -- Check if the foreign key from chat_messages to chat_sessions exists\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.table_constraints \n    WHERE constraint_name = 'chat_messages_session_id_fkey' \n    AND table_name = 'chat_messages'\n  ) THEN\n    -- Add the constraint\n    ALTER TABLE chat_messages \n    ADD CONSTRAINT chat_messages_session_id_fkey \n    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;\n    \n    RAISE NOTICE 'Added foreign key constraint from chat_messages to chat_sessions';\n  ELSE\n    RAISE NOTICE 'Foreign key from chat_messages to chat_sessions already exists';\n  END IF;\n  \n  -- Check if pets table exists\n  IF EXISTS (\n    SELECT 1 FROM information_schema.tables \n    WHERE table_schema = 'public' AND table_name = 'pets'\n  ) THEN\n    -- Check if the foreign key from chat_sessions to pets exists\n    IF EXISTS (\n      SELECT 1 FROM information_schema.table_constraints \n      WHERE constraint_name = 'chat_sessions_pet_id_fkey' \n      AND table_name = 'chat_sessions'\n    ) THEN\n      -- Drop the existing constraint\n      ALTER TABLE chat_sessions \n      DROP CONSTRAINT chat_sessions_pet_id_fkey;\n      \n      RAISE NOTICE 'Dropped existing foreign key constraint to pets table';\n    END IF;\n    \n    -- Add the constraint with ON DELETE SET NULL\n    ALTER TABLE chat_sessions \n    ADD CONSTRAINT chat_sessions_pet_id_fkey \n    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;\n    \n    RAISE NOTICE 'Added proper foreign key constraint to pets table with ON DELETE SET NULL';\n  ELSE\n    RAISE NOTICE 'Pets table does not exist. Foreign key constraint not added.';\n  END IF;\nEND\n$$;\n\n-- Force refresh of schema cache for tables\nANALYZE chat_sessions;\nANALYZE chat_messages;\n\n-- Verify if everything is set up correctly\nDO $$\nDECLARE\n  sessions_count INTEGER;\n  has_title BOOLEAN;\n  has_name BOOLEAN;\nBEGIN\n  -- Count existing sessions\n  SELECT COUNT(*) INTO sessions_count FROM chat_sessions;\n  RAISE NOTICE 'Current chat_sessions count: %', sessions_count;\n  \n  -- Verify column situation\n  SELECT \n    EXISTS (SELECT 1 FROM information_schema.columns \n           WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n           AND column_name = 'title') INTO has_title;\n    \n  SELECT \n    EXISTS (SELECT 1 FROM information_schema.columns \n           WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n           AND column_name = 'name') INTO has_name;\n  \n  RAISE NOTICE 'Column check - Title exists: %, Name exists: %', has_title, has_name;\nEND\n$$;\n";
};
exports.getChatTablesSQLFix = getChatTablesSQLFix;
/**
 * Diagnoses issues with the chat system database structure
 */
var diagnoseChatTables = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, sessionTable, sessionError, titleColumnIssue, _b, columnCheck, columnError, hasTitle, hasName, columnCheckError_1, _c, testSession, createError, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 9, , 10]);
                return [4 /*yield*/, supabase_1.supabase
                        .from("chat_sessions")
                        .select("id")
                        .limit(1)];
            case 1:
                _a = _d.sent(), sessionTable = _a.data, sessionError = _a.error;
                if (sessionError) {
                    console.error("Error checking chat_sessions table:", sessionError);
                    if (sessionError.code === "42P01") {
                        // Table doesn't exist
                        return [2 /*return*/, {
                                tablesExist: false,
                                foreignKeyIssue: false,
                                titleColumnIssue: false,
                                message: "Chat tables don't exist. Run the SQL fix to create them."
                            }];
                    }
                    // Check for the title column error
                    if (sessionError.message &&
                        sessionError.message.includes('title') &&
                        sessionError.message.includes('column')) {
                        return [2 /*return*/, {
                                tablesExist: true,
                                foreignKeyIssue: false,
                                titleColumnIssue: true,
                                message: "Title column issue detected in chat_sessions. Run the fix."
                            }];
                    }
                    return [2 /*return*/, {
                            tablesExist: false,
                            foreignKeyIssue: false,
                            titleColumnIssue: false,
                            message: "Error checking tables: ".concat(sessionError.message)
                        }];
                }
                titleColumnIssue = false;
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                        sql: "\n          SELECT \n            EXISTS (SELECT 1 FROM information_schema.columns \n                  WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n                  AND column_name = 'title') as has_title,\n            EXISTS (SELECT 1 FROM information_schema.columns \n                  WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n                  AND column_name = 'name') as has_name\n        "
                    })];
            case 3:
                _b = _d.sent(), columnCheck = _b.data, columnError = _b.error;
                if (!columnError && columnCheck && columnCheck.length > 0) {
                    hasTitle = columnCheck[0].has_title;
                    hasName = columnCheck[0].has_name;
                    // Problem if we have title but not name, or both
                    titleColumnIssue = hasTitle;
                }
                return [3 /*break*/, 5];
            case 4:
                columnCheckError_1 = _d.sent();
                console.error("Error checking for title column:", columnCheckError_1);
                return [3 /*break*/, 5];
            case 5: return [4 /*yield*/, supabase_1.supabase
                    .from("chat_sessions")
                    .insert({
                    user_id: "00000000-0000-0000-0000-000000000000", // Dummy ID for test
                    name: "Test Session",
                    pet_id: null
                })
                    .select()];
            case 6:
                _c = _d.sent(), testSession = _c.data, createError = _c.error;
                // If creation fails due to foreign key constraint, we have an issue
                if (createError) {
                    console.error("Error creating test session:", createError);
                    // Check for title column issue again
                    if (createError.message &&
                        createError.message.includes('title') &&
                        createError.message.includes('column')) {
                        return [2 /*return*/, {
                                tablesExist: true,
                                foreignKeyIssue: false,
                                titleColumnIssue: true,
                                message: "Title column issue detected in chat_sessions. Run the fix."
                            }];
                    }
                    if (createError.message.includes("foreign key") ||
                        createError.message.includes("violates") ||
                        createError.message.includes("not-null")) {
                        return [2 /*return*/, {
                                tablesExist: true,
                                foreignKeyIssue: true,
                                titleColumnIssue: titleColumnIssue,
                                message: "Foreign key or NOT NULL constraint issue detected. Run the SQL fix."
                            }];
                    }
                    return [2 /*return*/, {
                            tablesExist: true,
                            foreignKeyIssue: false,
                            titleColumnIssue: titleColumnIssue,
                            message: "Unknown issue: ".concat(createError.message)
                        }];
                }
                if (!(testSession && testSession.length > 0)) return [3 /*break*/, 8];
                return [4 /*yield*/, supabase_1.supabase
                        .from("chat_sessions")
                        .delete()
                        .eq("id", testSession[0].id)];
            case 7:
                _d.sent();
                _d.label = 8;
            case 8: return [2 /*return*/, {
                    tablesExist: true,
                    foreignKeyIssue: false,
                    titleColumnIssue: titleColumnIssue,
                    message: titleColumnIssue
                        ? "Title column issue detected in chat_sessions. Run the fix."
                        : "Chat tables exist and appear to be correctly configured."
                }];
            case 9:
                error_1 = _d.sent();
                console.error("Error in diagnoseChatTables:", error_1);
                // Check for title column issue in the error
                if (error_1 instanceof Error &&
                    error_1.message.includes('title') &&
                    error_1.message.includes('column')) {
                    return [2 /*return*/, {
                            tablesExist: true,
                            foreignKeyIssue: false,
                            titleColumnIssue: true,
                            message: "Title column issue detected in chat_sessions. Run the fix."
                        }];
                }
                return [2 /*return*/, {
                        tablesExist: false,
                        foreignKeyIssue: true,
                        titleColumnIssue: false,
                        message: "Unexpected error: ".concat(error_1 instanceof Error ? error_1.message : String(error_1))
                    }];
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.diagnoseChatTables = diagnoseChatTables;
/**
 * Specialized fix for the "title" column schema issue in chat_sessions
 */
var fixTitleColumnIssue = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, columnCheck, checkError, hasTitle, hasName, renameError, migrateError, addError, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                console.log("Fixing title column issue in chat_sessions...");
                return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                        sql: "\n        SELECT \n          EXISTS (SELECT 1 FROM information_schema.columns \n                 WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n                 AND column_name = 'title') as has_title,\n          EXISTS (SELECT 1 FROM information_schema.columns \n                 WHERE table_schema = 'public' AND table_name = 'chat_sessions' \n                 AND column_name = 'name') as has_name\n      "
                    })];
            case 1:
                _a = _b.sent(), columnCheck = _a.data, checkError = _a.error;
                if (checkError) {
                    console.error("Error checking columns:", checkError);
                    return [2 /*return*/, {
                            success: false,
                            message: "Error checking columns: ".concat(checkError.message)
                        }];
                }
                hasTitle = columnCheck && columnCheck.length > 0 ? columnCheck[0].has_title : false;
                hasName = columnCheck && columnCheck.length > 0 ? columnCheck[0].has_name : false;
                console.log("Column check: Title column exists: ".concat(hasTitle, ", Name column exists: ").concat(hasName));
                if (!(hasTitle && !hasName)) return [3 /*break*/, 3];
                return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                        sql: "ALTER TABLE chat_sessions RENAME COLUMN title TO name;"
                    })];
            case 2:
                renameError = (_b.sent()).error;
                if (renameError) {
                    console.error("Error renaming title to name:", renameError);
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to rename title to name: ".concat(renameError.message)
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        message: "Successfully renamed 'title' column to 'name'"
                    }];
            case 3:
                if (!(hasTitle && hasName)) return [3 /*break*/, 5];
                return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                        sql: "\n          UPDATE chat_sessions \n          SET name = title \n          WHERE name IS NULL AND title IS NOT NULL;\n          \n          ALTER TABLE chat_sessions DROP COLUMN title;\n        "
                    })];
            case 4:
                migrateError = (_b.sent()).error;
                if (migrateError) {
                    console.error("Error handling title and name columns:", migrateError);
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to handle title and name columns: ".concat(migrateError.message)
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        message: "Successfully merged data from 'title' into 'name' and dropped 'title' column"
                    }];
            case 5:
                if (!!hasName) return [3 /*break*/, 7];
                return [4 /*yield*/, supabase_1.supabase.rpc('exec_sql', {
                        sql: "ALTER TABLE chat_sessions ADD COLUMN name TEXT;"
                    })];
            case 6:
                addError = (_b.sent()).error;
                if (addError) {
                    console.error("Error adding name column:", addError);
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to add name column: ".concat(addError.message)
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        message: "Successfully added 'name' column to chat_sessions"
                    }];
            case 7: return [2 /*return*/, {
                    success: true,
                    message: "No column issues to fix, schema looks correct"
                }];
            case 8:
                error_2 = _b.sent();
                console.error("Error in fixTitleColumnIssue:", error_2);
                return [2 /*return*/, {
                        success: false,
                        message: "Unexpected error: ".concat(error_2 instanceof Error ? error_2.message : String(error_2))
                    }];
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.fixTitleColumnIssue = fixTitleColumnIssue;
