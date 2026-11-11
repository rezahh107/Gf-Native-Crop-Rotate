<?php
/** wp eval-file: genuine GFAPI Entry and saved image assertion input. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'GFAPI' ) ) {
    throw new RuntimeException( 'Real WordPress/Gravity Forms required' );
}
$lab = getenv( 'GFNCR_LAB_DIR' );
$fixture = json_decode( file_get_contents( $lab . '/fixture.json' ), true, 512, JSON_THROW_ON_ERROR );
$form_id = (int) $fixture['form_id'];
$entries = GFAPI::get_entries( $form_id );
if ( is_wp_error( $entries ) || ! is_array( $entries ) ) {
    throw new RuntimeException( 'GFAPI::get_entries failed' );
}
$evidence = array( 'form_id' => $form_id, 'entry_count' => count( $entries ) );
if ( count( $entries ) === 1 ) {
    $id = (int) $entries[0]['id'];
    $entry = GFAPI::get_entry( $id );
    if ( is_wp_error( $entry ) || (int) $entry['form_id'] !== $form_id ) {
        throw new RuntimeException( 'GFAPI::get_entry association mismatch' );
    }
    $url = $entry['1'] ?? null;
    if ( ! is_string( $url ) || $url === '' ) {
        throw new RuntimeException( 'GF stored file URL missing' );
    }
    $path = GFFormsModel::get_physical_file_path( $url, $id );
    $resolved = realpath( $path );
    $upload = realpath( wp_get_upload_dir()['basedir'] );
    if ( ! $resolved || ! $upload || ! str_starts_with( $resolved, $upload . DIRECTORY_SEPARATOR ) ) {
        throw new RuntimeException( 'Stored file not inside WordPress uploads' );
    }
    $dimensions = getimagesize( $resolved );
    if ( $dimensions === false ) {
        throw new RuntimeException( 'Stored file cannot be decoded' );
    }
    $evidence += array(
        'entry_id' => $id,
        'entry_form_id' => (int) $entry['form_id'],
        'field_1_exists' => true,
        'stored_sha256' => hash_file( 'sha256', $resolved ),
        'stored_size' => filesize( $resolved ),
        'stored_width' => $dimensions[0],
        'stored_height' => $dimensions[1],
        'stored_mime' => $dimensions['mime'],
    );
}
file_put_contents( $lab . '/readback.json', wp_json_encode( $evidence, JSON_PRETTY_PRINT ) );
echo 'GF_REAL_ENTRY_READBACK_COUNT=' . count( $entries ) . PHP_EOL;
