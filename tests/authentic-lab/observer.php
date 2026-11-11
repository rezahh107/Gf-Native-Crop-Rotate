<?php
/**
 * Test-only mu-plugin copied into disposable WordPress (NOT product code).
 * Never log proprietary files, request bodies, credentials, images or full paths.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
add_filter( 'gform_validation', function( $result ) {
    $form_id = (int) ( $result['form']['id'] ?? 0 );
    $raw = $_FILES['input_1'] ?? null;
    $file_present = is_array( $raw ) && isset( $raw['name'] ) && is_string( $raw['name'] ) && $raw['name'] !== '';
    $tmp = $file_present ? ( $raw['tmp_name'] ?? '' ) : '';
    $safe_name = $file_present ? basename( $raw['name'] ) : '';
    $data = array(
        'form_id' => $form_id,
        'file_present' => $file_present,
        'file_name' => $safe_name,
        'file_size' => $file_present ? (int) ( $raw['size'] ?? -1 ) : null,
        'tmp_sha256' => $tmp && is_uploaded_file( $tmp ) ? hash_file( 'sha256', $tmp ) : null,
        'marker_confirmed' => isset( $_POST["gfncr_confirm_{$form_id}_1"] )
            && wp_unslash( $_POST["gfncr_confirm_{$form_id}_1"] ) === 'confirmed',
        'result_valid_at_priority_20' => (bool) $result['is_valid'],
    );
    file_put_contents( getenv( 'GFNCR_LAB_DIR' ) . '/validation.jsonl', wp_json_encode( $data ) . PHP_EOL, FILE_APPEND | LOCK_EX );
    return $result;
}, 20 );
add_action( 'gform_after_submission', function( $entry, $form ) {
    file_put_contents( getenv( 'GFNCR_LAB_DIR' ) . '/after-submission.json', wp_json_encode( array(
        'form_id' => (int) $form['id'],
        'entry_id' => (int) $entry['id'],
        'field_1_nonempty' => ! empty( $entry['1'] ),
    ), JSON_PRETTY_PRINT ) );
}, 10, 2 );
