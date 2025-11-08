import { NextResponse } from 'next/server'

// Mock customer data with company associations
const customerData = [
  { id: '1', name: 'Good Life- Reliance', company: 'CDPL', value: 'good_life_reliance' },
  { id: '2', name: 'Curate- Reliance', company: 'CDPL', value: 'curate_reliance' },
  { id: '3', name: 'Vedaka- Amazon', company: 'CDPL', value: 'vedaka_amazon' },
  { id: '4', name: 'Mamanourish', company: 'CDPL', value: 'mamanourish' },
  { id: '5', name: 'Rhine Valley', company: 'CDPL', value: 'rhine_valley' },
  { id: '6', name: 'Healing Hands', company: 'CDPL', value: 'healing_hands' },
  { id: '7', name: 'Dr Batra', company: 'CDPL', value: 'dr_batra' },
  { id: '8', name: 'DMart', company: 'CDPL', value: 'dmart' },
  { id: '9', name: 'Big Basket', company: 'CDPL', value: 'big_basket' },
  { id: '10', name: "Nature's Basket", company: 'CDPL', value: 'natures_basket' },
  
  // CFPL Customers (Candoor Foods Private Limited)
  { id: '11', name: 'Walmart India', company: 'CFPL', value: 'walmart_india' },
  { id: '12', name: 'Metro Cash & Carry', company: 'CFPL', value: 'metro_cash_carry' },
  { id: '13', name: 'Star Bazaar', company: 'CFPL', value: 'star_bazaar' },
  { id: '14', name: 'HyperCity', company: 'CFPL', value: 'hypercity' },
  { id: '15', name: 'Spar Hypermarket', company: 'CFPL', value: 'spar_hypermarket' },
  { id: '16', name: 'FoodWorld', company: 'CFPL', value: 'foodworld' },
  { id: '17', name: 'Heritage Fresh', company: 'CFPL', value: 'heritage_fresh' },
  { id: '18', name: 'Easyday Club', company: 'CFPL', value: 'easyday_club' },
  
  // Additional customers for different companies
  { id: '19', name: 'Reliance Fresh', company: 'RRIL', value: 'reliance_fresh' },
  { id: '20', name: 'Jio Mart', company: 'RRIL', value: 'jio_mart' },
  { id: '21', name: 'Spencer retail', company: 'OTHER', value: 'spencer_retail' },
  { id: '22', name: 'Future Retail', company: 'OTHER', value: 'future_retail' },
  { id: '23', name: 'Godrej Nature Basket', company: 'OTHER', value: 'godrej_nature_basket' },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company') || 'CDPL'
    const search = searchParams.get('search') || ''

    // Filter by company first
    let filteredCustomers = customerData.filter(customer => 
      customer.company === company
    )

    // Then filter by search term if provided
    if (search) {
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Add "Other" option at the end
    const customersWithOther = [
      ...filteredCustomers,
      { id: 'other', name: 'Other', company: company, value: 'other' }
    ]

    return NextResponse.json({
      success: true,
      data: customersWithOther,
      total: customersWithOther.length,
      company: company,
      search: search
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customers',
        message: 'An error occurred while retrieving customer dropdown data'
      },
      { status: 500 }
    )
  }
}

// Optional: Support POST for creating new customer entries
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, company = 'CDPL' } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      )
    }

    // Generate value from name
    const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_')

    const newCustomer = {
      id: `custom_${Date.now()}`,
      name,
      company,
      value
    }

    return NextResponse.json({
      success: true,
      data: newCustomer,
      message: 'Customer created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create customer',
        message: 'An error occurred while creating the customer'
      },
      { status: 500 }
    )
  }
}