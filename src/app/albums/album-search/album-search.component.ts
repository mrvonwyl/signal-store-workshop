import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { ProgressBarComponent } from '@/shared/ui/progress-bar.component';
import { SortOrder } from '@/shared/models/sort-order.model';
import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { AlbumFilterComponent } from './album-filter/album-filter.component';
import { AlbumListComponent } from './album-list/album-list.component';
import { patchState, signalState } from '@ngrx/signals';
import { AlbumsService } from '@/albums/albums.service';

@Component({
  selector: 'ngrx-album-search',
  standalone: true,
  imports: [ProgressBarComponent, AlbumFilterComponent, AlbumListComponent],
  template: `
    <ngrx-progress-bar [showProgress]="state.showProgress()" />

    <div class="container">
      <h1>Albums ({{ totalAlbums() }})</h1>

      <ngrx-album-filter
        [query]="state.query()"
        [order]="state.order()"
        (queryChange)="updateQuery($event)"
        (orderChange)="updateOrder($event)"
      />

      <ngrx-album-list
        [albums]="filteresAlbums()"
        [showSpinner]="showSpinner()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AlbumSearchComponent implements OnInit {
  private readonly albumService = inject(AlbumsService);

  state = signalState<{
    query: string;
    order: SortOrder;
    showProgress: false;
    albums: Album[];
  }>({
    query: '',
    order: 'asc',
    showProgress: false,
    albums: [],
  });

  filteresAlbums = computed(() => {
    return sortAlbums(
      searchAlbums(this.state.albums(), this.state.query()),
      this.state.order(),
    );
  });

  totalAlbums = computed(() => {
    return this.filteresAlbums().length;
  });

  showSpinner = computed(() => {
    return this.state.showProgress() && this.state.albums().length === 0;
  });

  ngOnInit(): void {
    this.albumService
      .getAll()
      .subscribe((albums) => patchState(this.state, { albums }));
  }

  updateQuery(query: string): void {
    patchState(this.state, { query });
  }

  updateOrder(order: SortOrder): void {
    patchState(this.state, { order });
  }
}
