<?php
/** Post-run authentic GFAPI readback for all three distinct submissions (standard/iframe/modern). */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'GFAPI' ) ) {
    throw new RuntimeException( 'Genuine WordPress/Gravity Forms required' );
}
$dir = getenv( 'GFNCR_LAB_DIR' );
$fixture = json_decode( file_get_contents( $dir . '/fixture.json' ), true, 512, JSON_THROW_ON_ERROR );
$form_id = (int) $fixture['form_id'];
$entries = GFAPI::get_entries( $form_id );
if ( is_wp_error( $entries ) || ! is_array( $entries ) ) {
    throw new RuntimeException( 'GFAPI::get_entries failed' );
}
$evidence = array( 'form_id' => $form_id, 'entry_count' => count( $entries ), 'entries' => array() );
foreach ( $entries as $entry_row ) {
    $id = (int) $entry_row['id'];
    $entry = GFAPI::get_entry( $id );
    if ( is_wp_error( $entry ) || (int) $entry['form_id'] !== $form_id ) {
        throw new RuntimeException( 'GFAPI::get_entry association mismatch' );
    }
    $url = $entry['1'] ?? null;
    if ( ! is_string( $url ) || $url === '' ) {
        throw new RuntimeException( 'Stored field upload URL missing' );
    }
    $path = GFFormsModel::get_physical_file_path( $url, $id );
    $resolved = realpath( $path );
    $upload = realpath( wp_get_upload_dir()['basedir'] );
    if ( ! $resolved || ! $upload || ! str_starts_with( $resolved, $upload . DIRECTORY_SEPARATOR ) ) {
        throw new RuntimeException( 'Stored image outside uploads' );
    }
    $dimensions = getimagesize( $resolved );
    if ( $dimensions === false ) { throw new RuntimeException( 'Image decode failure' ); }
    $evidence['entries'][] = array(
        'entry_id' => $id,
        'form_id' => (int) $entry['form_id'],
        'sha256' => hash_file( 'sha256', $resolved ),
        'size' => filesize( $resolved ),
        'width' => $dimensions[0],
        'height' => $dimensions[1],
        'mime' => $dimensions['mime'],
    );
}
file_put_contents( $dir . '/ajax-readback.json', wp_json_encode( $evidence, JSON_PRETTY_PRINT ) );
echo 'REAL_GF_AJAX_ENTRY_READBACK_COUNT=' . count( $entries ) . PHP_EOL;
