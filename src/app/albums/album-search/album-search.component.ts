import {
  ChangeDetectionStrategy,
  Component,
  Inject,
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
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AlbumsService } from '@/albums/albums.service';
import { EMPTY, catchError, exhaustMap, map, pipe, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tapResponse } from '@ngrx/operators';

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

  private readonly snackbar = inject(MatSnackBar);

  state = signalState<{
    query: string;
    order: SortOrder;
    showProgress: boolean;
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

  loadAllAlbums = rxMethod<void>(
    pipe(
      tap(() => {
        patchState(this.state, { showProgress: true });
      }),
      exhaustMap(() => {
        return this.albumService.getAll().pipe(
          tapResponse({
            next: (albums) =>
              patchState(this.state, { albums, showProgress: false }),
            error: (error: Error) =>
              this.snackbar.open(error.message, 'close', { duration: 5_000 }),
          }),
        );
      }),
    ),
  );

  ngOnInit(): void {
    this.loadAllAlbums();
  }

  updateQuery(query: string): void {
    patchState(this.state, { query });
  }

  updateOrder(order: SortOrder): void {
    patchState(this.state, { order });
  }
}
