import { User, UserRole } from '../domain/types';
import { appendRows, findRows, updateRow, ensureHeaders } from './operations';
import { formatDate, parseDate } from '../utils/helpers';

const SHEET_NAME = 'Foydalanuvchilar';
const HEADERS = ['ID', 'Username', 'Ism', 'Familiya', 'Rol', 'Faol', 'Yaratilgan', 'Til'];

export async function initUsersSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToUser(row: any[]): User {
    const activeRaw = row[5];
    const active = activeRaw === true || String(activeRaw).toLowerCase() === 'true';

    return {
        userId: String(row[0] || ''),
        username: row[1] || undefined,
        firstName: row[2] || '',
        lastName: row[3] || undefined,
        role: (row[4] as UserRole) || UserRole.STAFF,
        active,
        createdAt: parseDate(row[6]),
        language: row[7] || 'uz',
    };
}

function userToRow(user: User): any[] {
    return [
        user.userId,
        user.username || '',
        user.firstName,
        user.lastName || '',
        user.role,
        user.active,
        formatDate(user.createdAt),
        user.language || 'uz',
    ];
}

export async function createUser(
    userId: string,
    username: string | undefined,
    firstName: string,
    lastName: string | undefined,
    role: UserRole,
    language: string = 'uz'
): Promise<User> {
    const user: User = {
        userId,
        username,
        firstName,
        lastName,
        role,
        active: true,
        createdAt: new Date(),
        language,
    };

    await appendRows(SHEET_NAME, [userToRow(user)]);
    return user;
}

export async function getUserById(userId: string): Promise<User | null> {
    const results = await findRows(SHEET_NAME, (row) => String(row[0]) === String(userId));
    return results.length > 0 ? rowToUser(results[0].row) : null;
}

export async function getAllUsers(activeOnly: boolean = true): Promise<User[]> {
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false;
        if (activeOnly) {
            const activeRaw = row[5];
            const isActive = activeRaw === true || String(activeRaw).toLowerCase() === 'true';
            if (!isActive) return false;
        }
        return true;
    });

    return results.map(r => rowToUser(r.row));
}

export async function updateUser(
    userId: string,
    updates: Partial<Pick<User, 'role' | 'active' | 'language'>>
): Promise<User | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === userId);

    if (results.length === 0) {
        return null;
    }

    const user = rowToUser(results[0].row);

    if (updates.role !== undefined) user.role = updates.role;
    if (updates.active !== undefined) user.active = updates.active;
    if (updates.language !== undefined) user.language = updates.language;

    await updateRow(SHEET_NAME, results[0].index, userToRow(user));
    return user;
}

export async function deleteUser(userId: string): Promise<boolean> {
    return (await updateUser(userId, { active: false })) !== null;
}
