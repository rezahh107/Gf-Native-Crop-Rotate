<?php
/** Host-independent callback/validation contract probes; NOT a Gravity Forms runtime. */
declare(strict_types=1);

$entry = dirname(__DIR__) . '/gf-native-crop-rotate.php';
$contents = file_get_contents($entry);
if ($contents === false) { throw new RuntimeException('Missing entrypoint'); }
foreach (['Plugin Name','Description','Version','Requires PHP','Text Domain','Update URI'] as $header) {
    if (!preg_match('/^\s*\*\s*'.preg_quote($header,'/').':\s*\S.*$/m',$contents)) {
        throw new RuntimeException("Missing header: $header");
    }
}
$lines=[]; $exit=0;
exec(escapeshellarg(PHP_BINARY).' '.escapeshellarg($entry).' 2>&1',$lines,$exit);
if ($exit!==0 || $lines!==[]) { throw new RuntimeException('Direct bootstrap unsafe'); }

define('ABSPATH','/synthetic-wordpress/');
$GLOBALS['hooks']=[];
function add_action($hook,$callback,...$args) { $GLOBALS['hooks'][$hook]=$callback; }
function add_filter($hook,$callback,...$args) { $GLOBALS['hooks'][$hook]=$callback; }
function is_admin() { return false; }
function wp_doing_ajax() { return false; }
function esc_attr($s) { return htmlspecialchars((string)$s,ENT_QUOTES); }
function esc_html__($s,$d) { return $s; }
function __($s,$d) { return $s; }
function wp_unslash($s) { return stripslashes($s); }
function wp_enqueue_script(...$args) { $GLOBALS['enqueued'][]=$args[0]; }
function plugin_dir_url($file) { return 'https://invalid.example/'; }

ob_start(); require $entry; $output=ob_get_clean();
if ($output!=='' || ($GLOBALS['hooks']['plugins_loaded']??'')!=='gfncr_bootstrap') {
    throw new RuntimeException('Unexpected bootstrap registration');
}
class GFForms {}
gfncr_bootstrap();
foreach (['gform_field_standard_settings','gform_editor_js','gform_field_content','gform_enqueue_scripts','gform_validation'] as $hook) {
    if (empty($GLOBALS['hooks'][$hook])) { throw new RuntimeException("Hook not registered: $hook"); }
}
$field=(object)['id'=>3,'type'=>'fileupload','multipleFiles'=>false,'gfncrEnabled'=>true];
$disabled=clone $field; $disabled->gfncrEnabled=false;
$multi=clone $field; $multi->multipleFiles=true;
if (!gfncr_enabled($field) || gfncr_enabled($disabled) || gfncr_eligible($multi)) { throw new RuntimeException('Eligibility failed'); }
if (gfncr_field_content('<input>', $disabled,'',0,5)!=='<input>') { throw new RuntimeException('Opt-out drift'); }
$html=gfncr_field_content('<input>',$field,'',0,5);
if (!str_contains($html,'gfncr_confirm_5_3') || !str_contains($html,'gfncr-editor')) { throw new RuntimeException('Editor not rendered'); }
$invalidHtml=gfncr_field_content('<input>',$multi,'',0,5);
if (!str_contains($invalidHtml,'Submission is blocked')) { throw new RuntimeException('Missing invalid-state warning'); }
$GLOBALS['enqueued']=[];
gfncr_enqueue(['fields'=>[$disabled]],false);
if ($GLOBALS['enqueued']!==[]) { throw new RuntimeException('Opt-out enqueues assets'); }
gfncr_enqueue(['fields'=>[$field]],false);
if ($GLOBALS['enqueued']!==['gfncr-handoff']) { throw new RuntimeException('Eligible asset not enqueued'); }

$_FILES=['input_3'=>['name'=>'original.png']]; $_POST=[];
$result=['is_valid'=>true,'form'=>['id'=>5,'fields'=>[$field]]];
$rejected=gfncr_validate($result);
if ($rejected['is_valid']!==false || !$field->failed_validation) { throw new RuntimeException('Raw original not rejected'); }
$field->failed_validation=false;
$_POST=['gfncr_confirm_5_3'=>'confirmed'];
if (gfncr_validate($result)['is_valid']!==true) { throw new RuntimeException('Confirmed native file rejected'); }
$_FILES=[]; $_POST=[];
if (gfncr_validate($result)['is_valid']!==true) { throw new RuntimeException('Optional empty field rejected'); }
$result['form']['fields']=[$multi];
if (gfncr_validate($result)['is_valid']!==false) { throw new RuntimeException('Multi-file bypass'); }
$result['form']['fields']=[$disabled];
if (gfncr_validate($result)['is_valid']!==true) { throw new RuntimeException('Opt-out validation drift'); }
echo "Bootstrap, eligibility, handoff marker contract PASS (stubbed host, not GF).\n";
