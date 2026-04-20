import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-8',
  imports: [DesignNavComponent],
  templateUrl: './design-8.html',
  styleUrl: './design-8.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design8Component {}
