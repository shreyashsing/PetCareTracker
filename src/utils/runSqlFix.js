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
exports.runFixedSqlScript = void 0;
var supabase_1 = require("../services/supabase");
// Fixed SQL script as a string to create or fix chat tables
var FIXED_SQL = "\n/* \n * This is a fixed version of the chat tables creation script\n * It creates chat tables with a nullable pet_id column to avoid foreign key constraint issues\n * This script should be run in the Supabase SQL Editor\n */\n\n-- Create UUID extension if not exists\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n\n-- Create chat_sessions table if not exists\nCREATE TABLE IF NOT EXISTS chat_sessions (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  user_id UUID NOT NULL,\n  name TEXT,\n  pet_id UUID NULL, -- NOTE: Making pet_id nullable to avoid foreign key issues\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Add an index for performance\nCREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);\nCREATE INDEX IF NOT EXISTS chat_sessions_pet_id_idx ON chat_sessions(pet_id);\n\n-- Setup Row Level Security\nALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;\n\n-- Create policy for chat_sessions\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_user_policy'\n  ) THEN\n    CREATE POLICY chat_sessions_user_policy ON chat_sessions\n      USING (auth.uid() = user_id)\n      WITH CHECK (auth.uid() = user_id);\n  END IF;\nEND\n$$;\n\n-- Create chat_messages table if not exists\nCREATE TABLE IF NOT EXISTS chat_messages (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,\n  content TEXT NOT NULL,\n  role TEXT NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Add an index for performance\nCREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);\n\n-- Setup Row Level Security\nALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;\n\n-- Create policy for chat_messages\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_user_policy'\n  ) THEN\n    CREATE POLICY chat_messages_user_policy ON chat_messages\n      USING (EXISTS (\n        SELECT 1 FROM chat_sessions\n        WHERE chat_sessions.id = chat_messages.session_id\n        AND chat_sessions.user_id = auth.uid()\n      ))\n      WITH CHECK (EXISTS (\n        SELECT 1 FROM chat_sessions\n        WHERE chat_sessions.id = chat_messages.session_id\n        AND chat_sessions.user_id = auth.uid()\n      ));\n  END IF;\nEND\n$$;\n\n-- Add foreign key to pets table only if it exists\nDO $$\nBEGIN\n  -- Check if pets table exists\n  IF EXISTS (\n    SELECT 1 FROM information_schema.tables \n    WHERE table_schema = 'public' AND table_name = 'pets'\n  ) THEN\n    -- Check if foreign key constraint already exists\n    IF NOT EXISTS (\n      SELECT 1 FROM information_schema.table_constraints \n      WHERE constraint_name = 'chat_sessions_pet_id_fkey' \n      AND table_name = 'chat_sessions'\n    ) THEN\n      -- Add foreign key constraint\n      ALTER TABLE chat_sessions \n      ADD CONSTRAINT chat_sessions_pet_id_fkey \n      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;\n      \n      RAISE NOTICE 'Foreign key constraint to pets table added successfully.';\n    ELSE\n      RAISE NOTICE 'Foreign key constraint to pets table already exists.';\n    END IF;\n  ELSE\n    RAISE NOTICE 'Pets table does not exist. Foreign key constraint not added.';\n  END IF;\nEND\n$$;\n";
/**
 * Utility function to run the fixed SQL script to create or fix chat tables
 * This should be called when the Pet Assistant feature is failing due to foreign key constraints
 */
var runFixedSqlScript = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error, _a, sessionTableExists, sessionCheckError, alterSql, alterError, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                console.log("Attempting to run fixed SQL script to create chat tables...");
                return [4 /*yield*/, supabase_1.supabase.rpc("exec_sql", { sql: FIXED_SQL })];
            case 1:
                error = (_b.sent()).error;
                if (!error) return [3 /*break*/, 4];
                console.error("Error running fixed SQL script:", error);
                // If RPC fails, try to run the SQL script manually
                console.log("Attempting alternative approach to fix tables...");
                return [4 /*yield*/, supabase_1.supabase
                        .from("chat_sessions")
                        .select("id")
                        .limit(1)];
            case 2:
                _a = _b.sent(), sessionTableExists = _a.data, sessionCheckError = _a.error;
                if (sessionCheckError) {
                    // Table likely doesn't exist, we need to provide manual instructions
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to run SQL script. Please run the SQL in 'src/services/sql/create_tables_fixed.sql' manually in the Supabase SQL Editor."
                        }];
                }
                alterSql = "\n        ALTER TABLE chat_sessions \n        ALTER COLUMN pet_id DROP NOT NULL;\n      ";
                return [4 /*yield*/, supabase_1.supabase.rpc("exec_sql", { sql: alterSql })];
            case 3:
                alterError = (_b.sent()).error;
                if (alterError) {
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to modify existing tables. Please run the SQL in 'src/services/sql/create_tables_fixed.sql' manually in the Supabase SQL Editor."
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        message: "Successfully modified chat_sessions table to make pet_id nullable."
                    }];
            case 4: return [2 /*return*/, {
                    success: true,
                    message: "Successfully ran fixed SQL script to create chat tables."
                }];
            case 5:
                error_1 = _b.sent();
                console.error("Error in runFixedSqlScript:", error_1);
                return [2 /*return*/, {
                        success: false,
                        message: "Failed to fix tables: ".concat(error_1 instanceof Error ? error_1.message : String(error_1))
                    }];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.runFixedSqlScript = runFixedSqlScript;
