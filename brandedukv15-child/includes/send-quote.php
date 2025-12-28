<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON data
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Check for new format (customer.fullName) or old format (customer.firstName)
    $customer = $data['customer'];
    $product = isset($data['product']) ? $data['product'] : [];
    $customizations = isset($data['customizations']) ? $data['customizations'] : [];
    $basket = isset($data['basket']) ? $data['basket'] : [];
    
    // Get customer name (support both formats)
    $customerName = isset($customer['fullName']) ? $customer['fullName'] : 
                   (isset($customer['firstName']) ? $customer['firstName'] . ' ' . $customer['lastName'] : 'Customer');
    $customerEmail = isset($customer['email']) ? $customer['email'] : '';
    $customerPhone = isset($customer['phone']) ? $customer['phone'] : '';
    
    // Email settings
    $to = 'info@brandeduk.com';
    $subject = 'New Quote Request from ' . $customerName;
    
    // Build email body
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .header { background: #7c3aed; color: white; padding: 20px; }
            .section { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h1>🎉 New Quote Request</h1>
        </div>
        
        <div class='section'>
            <h2>👤 Customer Details</h2>
            <table>
                <tr><td class='label'>Name:</td><td class='value'>{$customerName}</td></tr>
                <tr><td class='label'>Email:</td><td class='value'>{$customerEmail}</td></tr>
                <tr><td class='label'>Phone:</td><td class='value'>{$customerPhone}</td></tr>
            </table>
        </div>
        
        <div class='section'>
            <h2>👕 Product Details</h2>
            <table>
                <tr><td class='label'>Product:</td><td class='value'>" . (isset($product['name']) ? $product['name'] : 'N/A') . "</td></tr>
                <tr><td class='label'>Code:</td><td class='value'>" . (isset($product['code']) ? $product['code'] : 'N/A') . "</td></tr>
                <tr><td class='label'>Color:</td><td class='value'>" . (isset($product['selectedColorName']) ? $product['selectedColorName'] : 'N/A') . "</td></tr>
                <tr><td class='label'>Quantity:</td><td class='value'>" . (isset($product['quantity']) ? $product['quantity'] : '0') . " units</td></tr>
                <tr><td class='label'>Price:</td><td class='value'>£" . (isset($product['price']) ? $product['price'] : '0') . " each</td></tr>
            </table>
        </div>
        
        <div class='section'>
            <h2>🎨 Customizations</h2>
            <table>";
    
    if (!empty($customizations)) {
        foreach ($customizations as $custom) {
            $method = isset($custom['method']) ? strtoupper($custom['method']) : 'N/A';
            $type = isset($custom['type']) ? $custom['type'] : 'N/A';
            $position = isset($custom['position']) ? $custom['position'] : 'Unknown';
            $logo = isset($custom['uploadedLogo']) && $custom['uploadedLogo'] ? '✅ Logo uploaded' : '❌ No logo';
            $text = isset($custom['text']) && $custom['text'] ? " - Text: {$custom['text']}" : '';
            $message .= "
                <tr>
                    <td class='label'>{$position}</td>
                    <td class='value'><strong>{$method}</strong> - {$type} - {$logo}{$text}</td>
                </tr>";
        }
    } else {
        $message .= "<tr><td colspan='2'>No customizations selected</td></tr>";
    }
    
    $message .= "
            </table>
        </div>
        
        <div class='section'>
            <h2>💰 Request Date</h2>
            <p>" . date('d/m/Y H:i:s') . "</p>
        </div>
        
        <p style='color: #6b7280; font-size: 12px;'>This quote was automatically generated from the BrandedUK website.</p>
    </body>
    </html>
    ";
    
    // Headers for HTML email
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: BrandedUK Quote System <noreply@brandeduk.com>" . "\r\n";
    $headers .= "Reply-To: {$customerEmail}" . "\r\n";
    
    // Send email
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['success' => true, 'message' => 'Quote sent successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to send email']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
