import { NgModule } from '@angular/core';
import { ApiModule } from '../../../services/files/api.module';
import { environment } from '../../../../environments/environment';

@NgModule({
  imports: [
    ApiModule.forRoot({
      rootUrl: environment.fileApiUrl
    })
  ],
  exports: [ApiModule]
})
export class FileApiConfigModule { }
