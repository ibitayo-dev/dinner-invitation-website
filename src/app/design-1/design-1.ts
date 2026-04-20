import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-1',
  imports: [DesignNavComponent],
  templateUrl: './design-1.html',
  styleUrl: './design-1.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design1Component {}
