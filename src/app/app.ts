import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationOutlet } from './shared/notifications/notification-outlet/notification-outlet';

@Component({
  imports: [RouterOutlet, NotificationOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
