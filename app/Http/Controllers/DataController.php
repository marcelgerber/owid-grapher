<?php namespace App\Http\Controllers;

use DB;
use Input;
use App\Variable;

use App\Http\Requests;
use App\Http\Controllers\Controller;

use Illuminate\Http\Request;

class DataController extends Controller {

	/**
	 * Display a listing of the resource.
	 *
	 * @return Response
	 */
	public function index() {
		return "Controller for data";
	}

	public function dimensions( Request $request ) {

		$data = array();
		$dataByVariable = array();
		$dataByEntity = array();
		$dataByEntityTime = array();

		//extra array for storing values for export
		$times = array();
		$entities = array();

		if( !Input::has( 'dimensions' ) ) {
			return false;
		}

		$dimensionsInput = Input::get( 'dimensions' );
		$dimensions = json_decode( $dimensionsInput );

		//find out how many variables we have 
		$groupByEntity = ( count( $dimensions ) > 1 )? false: true;

		foreach( $dimensions as $dimension ) {
			
			$id = $dimension->variableId;
			$property = $dimension->property;

			//use query builder instead of eloquent
			$variableData = DB::table( 'data_values' )
				->join( 'entities', 'data_values.fk_ent_id', '=', 'entities.id' )
				->join( 'times', 'data_values.fk_time_id', '=', 'times.id' )
				//->join( 'variables', 'data_values.fk_var_id', '=', 'variables.id' )
				->where( 'data_values.fk_var_id', $id )
				->get();

			if( $groupByEntity ) {
				
				$dataByEntity = array();

				//group variable data by entities
				foreach( $variableData as $datum ) {

					$entityId = $datum->fk_ent_id;
					
					//do we have already object for that entity
					if( !array_key_exists($entityId, $dataByEntity) ) {
						$dataByEntity[ $entityId ] = array( 
							"id" => intval($entityId),
							"key" => $datum->name,
							"values" => []
						);
					}

					$dataByEntity[ $entityId ][ "values" ][] = array( "x" => floatval($datum->label), "y" => floatval($datum->value) );

					//store for the need of export 
					if( !array_key_exists($entityId, $dataByEntityTime) ) {
						$dataByEntityTime[ $entityId ] = [];
						$entities[ $entityId ] = $datum->name; 
					}
					$dataByEntityTime[ $entityId ][ $datum->label ] = $datum->value;
					$times[ $datum->label ] = true;

					//more complicated case for scatter plot and else
					//do we have already array for that value
					/*if( !array_key_exists( $i, $dataByEntity[ $entityId ][ "values" ] ) ) {
						$dataByEntity[ $entityId ][ "values" ][ $i ] = [ "x" => floatval($datum->label), "y" => floatval($datum->value) ];
					}
					$i++;*/
					/*$values = $data[ $entityId ][ "values" ][ $i ];
					$values[ $property ] = $datum->value;
					$data[ $entityId ][ "values" ][ $i ] = $values;*/

				}

			} else {

				//multivariables
				$dataByVariable[ "id-".$id ] = array( 
					"id" => $id,
					"key" => $dimension->variableId,
					"values" => []
				);

				foreach( $variableData as $datum ) {
					$dataByVariable[ "id-".$id ][ "values" ][] = array( "x" => floatval($datum->label), "y" => floatval($datum->value) );
					$times[$datum->label] = true;
				}

			}

		}

		if( $groupByEntity ) {
			//convert to array
			foreach( $dataByEntity as $entityData ) {
				$data[] = $entityData;
			}
		} else {
			//convert to array
			foreach( $dataByVariable as $varData ) {
				$data[] = $varData;
			}
		}
	
		if( $request->ajax() ) {

			return ['success' => true, 'data' => $data ];

		} else {

			//process data to csv friendly format
			$timeKeys = array_keys( $times );
			
			//construct first row
			$firstRow = $timeKeys;
			array_unshift( $firstRow, "Times" ); 

			$exportData = [ $firstRow ];
			foreach( $dataByEntityTime as $entityId=>$entityData ) {
				//first insert name
				$entityName = ( array_key_exists($entityId, $entities) )? $entities[$entityId]: "";
				$rowData = [ $entityName ];
				//then insert times
				foreach( $timeKeys as $time ) {
					//does value exist for given time and entity?
					if( !array_key_exists($time, $entityData) ) {
						$rowData[] = "x"; 
					} else {
						//value exists
						$rowData[] = $entityData[$time];
					} 
				}
				$exportData[] = $rowData;
			}

			return $this->downloadCsv( $exportData );

			if( Input::has( 'export' ) && Input::get( 'export' ) == 'csv' ) {
				
				//http://localhost:8888/oxford/our-world-in-data-chart-builder/public/data/dimensions?dimensions=%5B%7B%22variableId%22%3A%221%22%2C%22property%22%3A%22y%22%2C%22name%22%3A%22Y+axis%22%7D%5D
				//return $data;
				return $this->downloadCsv( $exportData );
			
			} else {

				//not ajax request, nor csv export, just spit out whatever is in data
				return $data;

			}

		}

	}

	public function downloadCsv( $data ) {

		$fileName = 'data-' .date('Y-m-d H:i:s'). '.csv';
		$headers = [
			'Cache-Control'	=>	'must-revalidate, post-check=0, pre-check=0',
			'Content-type' => 'text/csv',
			'Content-Disposition' => 'attachment; filename=' .$fileName,
			'Expires' => '0',
			'Pragma' => 'public'
		];

		$csv = \League\Csv\Writer::createFromFileObject(new \SplTempFileObject());
		foreach($data as $datum) {
            $csv->insertOne($datum);
        }
        $csv->output( $fileName );
        //have to die out, for laravel not to append non-sense
		die();
	
	}

	public function entities( Request $request ) {


		$data = array();
		if( !Input::has( 'variableIds' ) ) {
			return false;
		}

		$variableIdsInput = Input::get( 'variableIds' );
		$variableIds = explode( ',', $variableIdsInput );

		//use query builder instead of eloquent
		$entitiesData = DB::table( 'data_values' )
			->select( 'entities.id', 'entities.name' )
			->join( 'entities', 'data_values.fk_ent_id', '=', 'entities.id' )
			->whereIn( 'data_values.fk_var_id', $variableIds )
			->groupBy( 'name' )
			->get();

		$data = $entitiesData;

		if( $request->ajax() ) {

			return ['success' => true, 'data' => $data ];

		} else {
			//not ajax request, just spit out whatever is in data
			return $data;
		}

	}

	public function times( Request $request ) {

		$data = array();
		if( !Input::has( 'variableIds' ) ) {
			return false;
		}

		$variableIdsInput = Input::get( 'variableIds' );
		$variableIds = explode( ',', $variableIdsInput );

		//use query builder instead of eloquent
		$timesData = DB::table( 'data_values' )
			->select( 'times.id', 'times.date', 'times.label' )
			->join( 'times', 'data_values.fk_time_id', '=', 'times.id' )
			->whereIn( 'data_values.fk_var_id', $variableIds )
			->groupBy( 'date' )
			->get();

		$data = $timesData;

		if( $request->ajax() ) {

			return ['success' => true, 'data' => $data ];

		} else {
			//not ajax request, just spit out whatever is in data
			return $data;
		}

	}

	public function exportToSvg( Request $request ) {
		/*print header(-type=>"image/svg+xml",
		     -attachment=>"d3js_export_demo.svg");
	print $data;
	exit(0);*/
		$type = 'image/svg+xml';
		$svg = '<svg version="1.1" baseProfile="full" width="300" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg>';
		return response( $svg )->header('Content-Type',$type);
	}


}
