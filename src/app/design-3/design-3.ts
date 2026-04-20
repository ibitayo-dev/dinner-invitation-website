import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-3',
  imports: [DesignNavComponent],
  templateUrl: './design-3.html',
  styleUrl: './design-3.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design3Component {}
