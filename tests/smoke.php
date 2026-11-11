<?php
/**
 * Host-independent packaging/bootstrap smoke check, not a WordPress integration test.
 */

declare(strict_types=1);

$entry = dirname(__DIR__) . '/gf-native-crop-rotate.php';
$contents = file_get_contents($entry);
if ($contents === false) {
    throw new RuntimeException('Cannot read plugin entry point.');
}

foreach (['Plugin Name', 'Description', 'Version', 'Requires PHP', 'Text Domain', 'Update URI'] as $header) {
    if (!preg_match('/^\s*\*\s*' . preg_quote($header, '/') . ':\s*\S.*$/m', $contents)) {
        throw new RuntimeException("Missing plugin header: {$header}");
    }
}
if (!preg_match('/^\s*\*\s*Text Domain:\s*gf-native-crop-rotate\s*$/m', $contents)) {
    throw new RuntimeException('Unexpected text domain.');
}

// A bare CLI invocation must exit without output instead of executing plugin code.
$lines = [];
$exitCode = 0;
exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($entry) . ' 2>&1', $lines, $exitCode);
if ($exitCode !== 0 || $lines !== []) {
    throw new RuntimeException('Direct plugin entry point did not exit quietly.');
}

// Loading the current inert foundation with a simulated ABSPATH must have no output.
define('ABSPATH', '/synthetic-wordpress/');
ob_start();
require $entry;
$output = ob_get_clean();
if ($output !== '') {
    throw new RuntimeException('Foundation bootstrap unexpectedly emitted output.');
}

echo "Plugin header and inert-bootstrap smoke PASS (host-independent).\n";
