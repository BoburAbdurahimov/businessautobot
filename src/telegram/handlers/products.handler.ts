import { getBot } from '../bot';
import { User } from '../../domain/types';
// import { t } from '../../i18n';
// import { productsListKeyboard, backButton, createInlineKeyboard } from '../keyboards';
// import * as productsRepo from '../../sheets/products.repository';
// import { formatCurrency } from '../../utils/helpers';
// import { setConversationState } from '../conversationState';

export async function handleProductsMenu(
    chatId: number,
    _data: string,
    _messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();
    await bot.sendMessage(chatId, '❌ Product management is disabled in this version.');
}
