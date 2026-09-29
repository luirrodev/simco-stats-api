import type bull from 'bull';

import { TelegramBotService } from './telegram-bot.service';
import type { TelegramNotificationJobData } from './telegram-notification.constants';
import { TelegramNotificationProcessor } from './telegram-notification.processor';

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: () => () => undefined,
}));

describe('TelegramNotificationProcessor', () => {
  const telegramBotService = {
    sendProactiveMessage: jest.fn(),
  } as unknown as jest.Mocked<TelegramBotService>;
  const processor = new TelegramNotificationProcessor(telegramBotService);
  const job = {
    id: 'telegram-notification-completed-5-1790683200000-123',
    attemptsMade: 2,
    data: {
      recipientId: 123,
      message: 'Mensaje pendiente',
    },
  } as bull.Job<TelegramNotificationJobData>;

  beforeEach(() => jest.clearAllMocks());

  it('delivers a pending notification', async () => {
    telegramBotService.sendProactiveMessage.mockResolvedValue({} as never);

    await expect(processor.processNotification(job)).resolves.toBeUndefined();

    expect(telegramBotService.sendProactiveMessage).toHaveBeenCalledWith(
      123,
      'Mensaje pendiente',
    );
  });

  it('throws delivery failures so Bull retains and retries the job', async () => {
    const error = new Error('Temporary DNS failure');
    telegramBotService.sendProactiveMessage.mockRejectedValue(error);

    await expect(processor.processNotification(job)).rejects.toThrow(error);
  });
});
