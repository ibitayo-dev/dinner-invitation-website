import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-2',
  imports: [DesignNavComponent],
  templateUrl: './design-2.html',
  styleUrl: './design-2.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design2Component {}
