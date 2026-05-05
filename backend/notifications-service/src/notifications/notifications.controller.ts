import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // GET /users/:userId/notifications
  @Get('users/:userId/notifications')
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('solo_no_leidas') solo_no_leidas?: string,
    @Query('categoria') categoria?: string,
    @Query('prioridad') prioridad?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getUserNotifications(userId, {
      solo_no_leidas: solo_no_leidas === 'true',
      categoria,
      prioridad,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // GET /users/:userId/notifications/unread
  @Get('users/:userId/notifications/unread')
  getUnread(@Param('userId') userId: string) {
    return this.service.getUnread(userId);
  }

  // GET /users/:userId/notifications/unread/count
  @Get('users/:userId/notifications/unread/count')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }

  // PUT /users/:userId/notifications/mark-all-read
  @Put('users/:userId/notifications/mark-all-read')
  markAllAsRead(@Param('userId') userId: string) {
    return this.service.markAllAsRead(userId);
  }

  // POST /notifications
  @Post('notifications')
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  // POST /notifications/bulk
  @Post('notifications/bulk')
  createBulk(@Body('notifications') notifications: CreateNotificationDto[]) {
    return this.service.createBulk(notifications);
  }

  // PUT /notifications/:id/mark-read
  @Put('notifications/:id/mark-read')
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  // PUT /notifications/:id/archive
  @Put('notifications/:id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  // DELETE /notifications/:id
  @Delete('notifications/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // POST /notifications/:id/track/email-open
  @Post('notifications/:id/track/email-open')
  trackEmailOpen(@Param('id') id: string) {
    return this.service.trackEmailOpen(id);
  }

  // POST /notifications/:id/track/email-click
  @Post('notifications/:id/track/email-click')
  trackEmailClick(@Param('id') id: string) {
    return this.service.trackEmailClick(id);
  }
}
