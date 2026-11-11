<?php
/**
 * Plugin Name: GF Native Crop & Rotate
 * Description: Experimental mandatory image crop for opted-in native Gravity Forms single-file fields; not production-qualified.
 * Version: 0.1.0-dev
 * Requires PHP: 8.2
 * Text Domain: gf-native-crop-rotate
 * Update URI: https://github.com/rezahh107/Gf-Native-Crop-Rotate
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** The Gravity Forms callback is registered only once all plugins are loaded. */
add_action( 'plugins_loaded', 'gfncr_bootstrap' );

function gfncr_bootstrap(): void {
    if ( ! class_exists( 'GFForms' ) ) {
        return;
    }
    add_action( 'gform_field_standard_settings', 'gfncr_editor_setting', 10, 2 );
    add_action( 'gform_editor_js', 'gfncr_editor_script' );
    add_filter( 'gform_field_content', 'gfncr_field_content', 10, 5 );
    add_action( 'gform_enqueue_scripts', 'gfncr_enqueue', 10, 2 );
    add_filter( 'gform_validation', 'gfncr_validate', 10, 1 );
}

/** Avoid truthy string "false" enabling a field from malformed imports. */
function gfncr_enabled( $field ): bool {
    return is_object( $field ) && in_array( $field->gfncrEnabled ?? null, array( true, 1, '1' ), true );
}

function gfncr_eligible( $field ): bool {
    return is_object( $field )
        && ( $field->type ?? null ) === 'fileupload'
        && in_array( $field->multipleFiles ?? false, array( false, 0, '0', null ), true );
}

function gfncr_editor_setting( $position, $form_id ): void {
    if ( 25 !== (int) $position ) {
        return;
    }
    ?>
    <li class="gfncr_setting field_setting">
        <input type="checkbox" id="gfncr_enabled" onclick="gfncrSetEnabled(this)" />
        <label for="gfncr_enabled"><?php esc_html_e( 'Enable Native Crop & Rotate (single-file only)', 'gf-native-crop-rotate' ); ?></label>
        <p class="description"><?php esc_html_e( 'Do not enable GP File Upload Pro on this same field.', 'gf-native-crop-rotate' ); ?></p>
    </li>
    <?php
}

function gfncr_editor_script(): void {
    ?>
    <script>
    fieldSettings.fileupload += ', .gfncr_setting';
    function gfncrSetEnabled(input) {
        const field = GetSelectedField();
        if (input.checked && field.multipleFiles) {
            input.checked = false;
            window.alert(<?php echo wp_json_encode( __( 'Only native Single File Upload is supported. Turn off Multi-File first; no configuration was changed.', 'gf-native-crop-rotate' ) ); ?>);
            return;
        }
        SetFieldProperty('gfncrEnabled', input.checked);
    }
    jQuery(document).on('gform_load_field_settings', function(event, field) {
        jQuery('#gfncr_enabled').prop('checked', field.gfncrEnabled === true || field.gfncrEnabled === 1 || field.gfncrEnabled === '1');
    });
    </script>
    <?php
}

function gfncr_field_content( $content, $field, $value, $entry_id, $form_id ) {
    if ( ! gfncr_enabled( $field ) || (int) $entry_id > 0 || ( is_admin() && ! wp_doing_ajax() ) ) {
        return $content;
    }
    if ( ! gfncr_eligible( $field ) ) {
        return $content . '<p role="alert">' . esc_html__( 'Native Crop & Rotate is unavailable: this field must be native Single File Upload. Submission is blocked until the field configuration is corrected.', 'gf-native-crop-rotate' ) . '</p>';
    }
    $form = (int) $form_id;
    $id = (int) $field->id;
    $name = 'gfncr_confirm_' . $form . '_' . $id;
    return $content . sprintf(
        '<div class="gfncr-editor" data-gfncr-field="%1$d" dir="auto"><input type="hidden" name="%2$s" value="" />' .
        '<div class="gfncr-controls" hidden><img class="gfncr-preview" alt="" style="max-width:240px;max-height:180px;display:block" />' .
        '<label>%3$s <input class="gfncr-crop" type="range" min="50" max="95" step="5" value="75" /></label>' .
        '<button type="button" class="gfncr-rotate">%4$s</button> <button type="button" class="gfncr-confirm">%5$s</button> <button type="button" class="gfncr-cancel">%6$s</button></div>' .
        '<p class="gfncr-status" role="status" aria-live="polite">%7$s</p></div>',
        $id,
        esc_attr( $name ),
        esc_html__( 'Center crop (%)', 'gf-native-crop-rotate' ),
        esc_html__( 'Rotate 90°', 'gf-native-crop-rotate' ),
        esc_html__( 'Confirm edited image', 'gf-native-crop-rotate' ),
        esc_html__( 'Cancel', 'gf-native-crop-rotate' ),
        esc_html__( 'Select one JPG or PNG image; confirm the crop before submitting.', 'gf-native-crop-rotate' )
    );
}

function gfncr_enqueue( $form, $is_ajax ): void {
    if ( empty( $form['fields'] ) || ! is_array( $form['fields'] ) ) {
        return;
    }
    foreach ( $form['fields'] as $field ) {
        if ( gfncr_enabled( $field ) && gfncr_eligible( $field ) ) {
            wp_enqueue_script( 'gfncr-handoff', plugin_dir_url( __FILE__ ) . 'assets/js/handoff.js', array(), '0.1.0-dev', true );
            break;
        }
    }
}

/** GF keeps responsibility for actual file validity and Entry persistence. */
function gfncr_validate( $result ) {
    if ( empty( $result['form']['fields'] ) || ! is_array( $result['form']['fields'] ) ) {
        return $result;
    }
    $form_id = (int) $result['form']['id'];
    foreach ( $result['form']['fields'] as $field ) {
        if ( ! gfncr_enabled( $field ) ) {
            continue;
        }
        $field_id = (int) $field->id;
        $file_key = 'input_' . $field_id;
        $upload = $_FILES[ $file_key ] ?? null;
        $has_file = is_array( $upload ) && ! empty( $upload['name'] );
        $marker_key = 'gfncr_confirm_' . $form_id . '_' . $field_id;
        $marker = $_POST[ $marker_key ] ?? null;
        $confirmed = is_string( $marker ) && 'confirmed' === wp_unslash( $marker );
        if ( gfncr_eligible( $field ) && ( ! $has_file || $confirmed ) ) {
            continue; // Optional empty input and GF's own required-field validation remain native.
        }
        $result['is_valid'] = false;
        $field->failed_validation = true;
        $field->validation_message = gfncr_eligible( $field )
            ? __( 'Confirm the edited image before submitting again.', 'gf-native-crop-rotate' )
            : __( 'Native Crop & Rotate requires a native Single File Upload field.', 'gf-native-crop-rotate' );
    }
    return $result;
}
