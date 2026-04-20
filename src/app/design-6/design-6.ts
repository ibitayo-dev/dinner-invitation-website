import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-6',
  imports: [DesignNavComponent],
  templateUrl: './design-6.html',
  styleUrl: './design-6.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design6Component {}
