// src/app/core/api-modules/auth-api.module.ts
import { NgModule } from '@angular/core';
// import { ApiModule, ApiConfiguration } from '../../../services/auth/api.module';
// import { environment } from '@environments/environment';
// import { ApiModule } from 'src/app/services/auth/api.module';
import { ApiConfiguration } from '../../../services/auth/api-configuration';
import { ApiModule } from '../../../services/auth/api.module';
import { environment } from '../../../../environments/environment';

@NgModule({
  imports: [
    ApiModule.forRoot({
      rootUrl: environment.authApiUrl
    })
  ],
  exports: [ApiModule]
})
export class AuthApiConfigModule { }
