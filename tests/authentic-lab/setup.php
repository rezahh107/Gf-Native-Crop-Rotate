<?php
/**
 * wp eval-file entrypoint. Creates disposable synthetic data using real GFAPI.
 * The browser (not this script) must exercise native submission and persistence.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'GFAPI' ) ) {
    fwrite( STDERR, "Genuine WordPress + Gravity Forms required.\n" );
    exit( 1 );
}

$form = array(
    'title' => 'GFNCR Synthetic P1 Native Upload',
    'description' => 'Disposable synthetic qualification; no personal images.',
    'is_active' => true,
    'fields' => array(
        array(
            'id' => 1,
            'type' => 'fileupload',
            'label' => 'Synthetic image',
            'isRequired' => true,
            'multipleFiles' => false,
            'allowedExtensions' => 'png,jpg,jpeg',
            'gfncrEnabled' => true,
        ),
    ),
);
$form_id = GFAPI::add_form( $form );
if ( is_wp_error( $form_id ) || ! is_numeric( $form_id ) || (int) $form_id < 1 ) {
    throw new RuntimeException( 'GFAPI::add_form failed' );
}
$stored = GFAPI::get_form( (int) $form_id );
$field = $stored['fields'][0] ?? null;
if ( ! $field instanceof GF_Field_FileUpload
    || (int) $field->id !== 1
    || $field->multipleFiles
    || ! gfncr_enabled( $field )
    || ! gfncr_eligible( $field ) ) {
    throw new RuntimeException( 'Native Single File / saved opt-in readback differs' );
}
$page_id = wp_insert_post( array(
    'post_type' => 'page',
    'post_title' => 'GFNCR Synthetic P1',
    'post_status' => 'publish',
    'post_content' => sprintf( '[gravityform id="%d" title="false" description="false" ajax="false"]', $form_id ),
), true );
if ( is_wp_error( $page_id ) || ! is_numeric( $page_id ) || $page_id < 1 ) {
    throw new RuntimeException( 'Could not publish local synthetic test page' );
}
file_put_contents( getenv( 'GFNCR_LAB_DIR' ) . '/fixture.json', wp_json_encode( array(
    'form_id' => (int) $form_id,
    'page_id' => (int) $page_id,
    'field_id' => (int) $field->id,
    'opt_in_persisted' => true,
    'native_single' => true,
    'url_path' => '/?page_id=' . (int) $page_id,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
echo 'GF_REAL_FORM_FIXTURE_PASS' . PHP_EOL;
