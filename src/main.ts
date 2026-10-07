import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/core/routes';
bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular({ mode: 'md', animated: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
  ],
}).catch(console.error);
