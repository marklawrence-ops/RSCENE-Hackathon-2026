<?php

// Safety tiers from the concept doc. Same for every LGU, so it is config, not data.
// The app gives non-potable guidance only; it never certifies water or proposes it for drinking (PD 1067, Art. 36).

return [

    'rules' => [
        [
            'source' => 'rain',
            'label' => 'Harvested rainwater (roof)',
            'allowed' => ['flushing', 'floor_washing', 'laundry', 'plants'],
            'never' => ['drinking', 'cooking', 'bathing'],
            'storage' => 'covered, labelled, first flush discarded',
            'default_decision' => 'reuse',
        ],
        [
            'source' => 'light_greywater',
            'label' => 'Light greywater (shower, laundry)',
            'allowed' => ['flushing', 'subsurface_watering'],
            'never' => ['spray_irrigation', 'drinking', 'storage_over_1_day', 'drums'],
            'storage' => 'same day only',
            'default_decision' => 'reuse',
        ],
        [
            'source' => 'wash_water',
            'label' => 'Commercial wash water',
            'allowed' => ['cleaning', 'landscaping'],
            'never' => ['drinking', 'raw_food_crops', 'storage_over_1_day'],
            'storage' => 'same day only',
            'default_decision' => 'treat_then_reuse',
        ],
        [
            'source' => 'condensate',
            'label' => 'Aircon condensate',
            'allowed' => ['plants', 'floor_cleaning'],
            'never' => ['drinking'],
            'storage' => 'use on site',
            'default_decision' => 'reuse',
        ],
        [
            'source' => 'kitchen',
            'label' => 'Kitchen sink water',
            'allowed' => [],
            'never' => ['all_reuse'],
            'storage' => 'none',
            'default_decision' => 'discharge',
        ],
        [
            'source' => 'toilet',
            'label' => 'Toilet water',
            'allowed' => [],
            'never' => ['all_reuse'],
            'storage' => 'none',
            'default_decision' => 'discharge',
        ],
    ],

    'uses' => [
        'flushing' => 'Toilet flushing',
        'floor_washing' => 'Floor and street washing',
        'laundry' => 'Laundry',
        'plants' => 'Plants',
        'subsurface_watering' => 'Sub-surface plant watering',
        'cleaning' => 'Cleaning',
        'landscaping' => 'Landscaping',
        'floor_cleaning' => 'Floor cleaning',
    ],

    'storage_rules' => [
        'Rainwater only',
        'Covered at all times',
        'Let the first minutes of rain run off',
        'Label "Hindi maiinom / Not for drinking"',
        'Keep apart from drinking water',
        'Use and refill every few weeks',
    ],

    // Plain-language reason shown for each decision.
    'reasons' => [
        'reuse' => ':source may be used for :use on the same site.',
        'treat_then_reuse' => ':source is often gritty: settle or filter it before :use. The app does not certify treatment.',
        'discharge' => ':source has no safe reuse; send it to the septic tank.',
    ],

];
