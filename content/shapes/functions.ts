// =============================================================================
// Area and Shapes
// (c) Mathigon
// =============================================================================


import {Point, Polygon, Segment} from '@mathigon/fermat';
import {animate, CanvasView, loadScript} from '@mathigon/boost';
import {Geopad, GeoPoint, Step} from '../shared/types';
import {BinarySwipe} from '../shared/components/binary-swipe'; // import types
import '../shared/components/binary-swipe';  // import component
import {VoronoiStep} from './types';

declare const d3: any;

const locationPoints = [
  new Point(34, 200),
  new Point(90, 171),
  new Point(99, 384),
  new Point(285, 180),
  new Point(295, 346),
  new Point(316, 209),
  new Point(343, 276),
  new Point(345, 46),
  new Point(368, 146),
  new Point(373, 252),
  new Point(388, 333),
  new Point(396, 170),
  new Point(415, 232),
  new Point(430, 103),
  new Point(449, 245),
  new Point(477, 30)
];

export async function voronoi($step: VoronoiStep) {

  await loadScript('/resources/shared/vendor/d3-delaunay.min.js');

  const colors = ['3c91e6', 'ff6b6b', 'ffe45e', '4ecdc4', '81366f', 'c93818', 'e2c312', '6bab90', 'e4533a'].map(c => '#' + c);

  const $canvas = $step.$('canvas.voronoi') as CanvasView;
  const $geopad = $step.$('x-geopad') as Geopad;
  const $voronoiButton = $step.$('button.show-voronoi')!;
  const bounds = [0, 0, $canvas.canvasWidth, $canvas.canvasHeight];

  $step.model.dynPoints = [];
  $step.model.vorOpacity = 0;
  $step.model.cells = [];

  locationPoints.forEach(locationPoint => {
    $geopad.drawPoint(locationPoint, {classes: 'red', interactive: false});
  });

  $step.model.cells = getVoronoiPolys(bounds).map(poly => {
    return {poly, over: false};
  });

  $voronoiButton.on('click', _ => {
    showVor($step);
  });

  $geopad.$svg.on('mousemove', e => {
    // console.log(e);
    $step.model.cells = $step.model.cells.map(cell => {
      const over = cell.poly.contains(new Point(e.offsetX, e.offsetY));
      return {...cell, over};
    });
  });

  $geopad.switchTool('point');
  $geopad.on('add:point', ({point}: {point: GeoPoint}) => {

    $step.model.dynPoints.push({gPoint: point, dlOpacity: 1});
    $step.model.dynPoints = $step.model.dynPoints.slice();

    handleAnim($step.model.dynPoints.length - 1, $step);

  });

  $geopad.on('move:point', ({gPoint}: {gPoint: GeoPoint}) => {

    $step.model.dynPoints =
      $step.model.dynPoints.map(dp => {
        if (gPoint.name == dp.gPoint.name) {
          return {...dp, gPoint};
        } else {
          return dp;
        }
      }).slice();

  });

  $step.model.watch(() => {

    if ($step.model.dynPoints.length == 1 && !$step.model.promptMorePoints) {
      $step.score('one-point');
      $step.model.promptMorePoints = true;
    }

    if ($step.model.dynPoints.length == 5 && !$step.model.showButton) {
      $step.score('five-points');
      // TODO show button
      $step.model.showButton = true;
    }

    if ($step.model.dynPoints.length == 8 && !$step.model.eightPoints) {
      $step.score('eight-points');
      $step.model.eightPoints = true;
    }

    $canvas.clear();

    const cells = $step.model.cells;

    if ($step.model.vorOpacity != 0) {
      cells.forEach((cell, i) => {
        const opacity = cell.over ? $step.model.vorOpacity / 2 : $step.model.vorOpacity / 3;
        $canvas.draw(
            cell.poly,
            {
              fill: colors[i % 9],
              stroke: 'black',
              strokeWidth: 2,
              opacity
            }
        );
      });
    }

    $step.model.dynPoints.forEach(({gPoint, dlOpacity}) => {

      const edges: Segment[] = [];

      let shortest = {len: Number.POSITIVE_INFINITY, ind: 0};

      locationPoints.forEach((locationPoint, i) => {
        const newEdge = new Segment(locationPoint, gPoint.value!);
        if (newEdge.length < shortest.len) {
          shortest = {len: newEdge.length, ind: i};
        }
        edges.push(newEdge);
      });

      edges.forEach((edge, i) => {
        const stroke = i == shortest.ind ? 'red' : 'black';
        const strokeWidth = i == shortest.ind ? 2 : 1;
        const opacity = i == shortest.ind ? 1 : dlOpacity;
        if (opacity != 0) {
          $canvas.draw(edge, {stroke, strokeWidth, opacity});
        }
      });
    });
  });

}

function getVoronoiPolys(bounds: number[]) {
  const dt = d3.Delaunay.from(locationPoints, getX, getY);
  const vor = dt.voronoi(bounds);

  const cellsRaw: number[][][] = Array.from(vor.cellPolygons());

  return cellsRaw.map(cellRaw => {
    const cellPoints = cellRaw.map(pointRaw => {
      return new Point(...pointRaw);
    });
    return new Polygon(...cellPoints);
  });
}

async function handleAnim(index: number, $step: VoronoiStep) {
  window.setTimeout((_: any) => {
    const _anim = animate((progress, _) => {
      const dlOpacity = 1 - progress;
      const dp = $step.model.dynPoints;
      dp[index] = {...dp[index], dlOpacity};
      $step.model.dynPoints = dp.slice();
    }, 500);
  }, 1000);
}

async function showVor($step: VoronoiStep) {
  const anim = animate((progress, _) => {
    $step.model.vorOpacity = progress;
  }, 2000);
  anim.promise.then(_ => $step.score('voronoi-diagram'));
}

function getX(p: Point) {
  return p.x;
}

function getY(p: Point) {
  return p.y;
}

export function sortPolygons($step: Step) {

  const $sort = $step.$('x-binary-swipe') as BinarySwipe;

  $sort.on('correct', comment => $step.addHint(comment, {class: 'correct'}));
  $sort.on('incorrect', ({hint}) => $step.addHint(hint, {class: 'incorrect'}));
  $sort.on('complete', () => {
    $step.score('cards-sorted');
  });
}
