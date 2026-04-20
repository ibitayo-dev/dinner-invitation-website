import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-5',
  imports: [DesignNavComponent],
  templateUrl: './design-5.html',
  styleUrl: './design-5.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design5Component {}
