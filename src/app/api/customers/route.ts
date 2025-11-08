import { NextResponse } from 'next/server'

// Mock customer data
const customers = [
  {
    id: '1',
    name: 'Good Life Reliance',
    email: 'contact@goodlife.com',
    company: 'Reliance Retail',
    totalComplaints: 5,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2', 
    name: 'Curate Reliance',
    email: 'support@curate.com',
    company: 'Reliance Digital',
    totalComplaints: 2,
    status: 'active',
    createdAt: '2024-02-20T14:20:00Z'
  },
  {
    id: '3',
    name: 'Vedaka Amazon',
    email: 'help@vedaka.com', 
    company: 'Amazon',
    totalComplaints: 8,
    status: 'active',
    createdAt: '2024-03-10T09:15:00Z'
  },
  {
    id: '4',
    name: 'Mamanourish',
    email: 'care@mamanourish.com',
    company: 'Mamanourish Foods',
    totalComplaints: 1,
    status: 'active',
    createdAt: '2024-04-05T16:45:00Z'
  },
  {
    id: '5',
    name: 'Rhine Valley',
    email: 'info@rhinevalley.com',
    company: 'Rhine Valley Foods',
    totalComplaints: 3,
    status: 'active',
    createdAt: '2024-04-12T11:30:00Z'
  },
  {
    id: '6',
    name: 'Healing Hands',
    email: 'support@healinghands.com',
    company: 'Healing Hands Products',
    totalComplaints: 0,
    status: 'active',
    createdAt: '2024-05-01T08:20:00Z'
  },
  {
    id: '7',
    name: 'Dr. Batra',
    email: 'contact@drbatra.com',
    company: 'Dr. Batra\'s Healthcare',
    totalComplaints: 4,
    status: 'active',
    createdAt: '2024-05-15T13:10:00Z'
  },
  {
    id: '8',
    name: 'DMart',
    email: 'help@dmart.com',
    company: 'Avenue Supermarts',
    totalComplaints: 6,
    status: 'active',
    createdAt: '2024-06-01T10:00:00Z'
  },
  {
    id: '9',
    name: 'Big Basket',
    email: 'support@bigbasket.com',
    company: 'Supermarket Grocery Supplies',
    totalComplaints: 2,
    status: 'active',
    createdAt: '2024-06-20T15:25:00Z'
  },
  {
    id: '10',
    name: 'Nature\'s Basket',
    email: 'care@naturesbasket.com',
    company: 'Godrej Nature\'s Basket',
    totalComplaints: 1,
    status: 'active',
    createdAt: '2024-07-10T12:40:00Z'
  }
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: customers,
      total: customers.length
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customers',
        message: 'An error occurred while retrieving customer data'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Create a new customer
    const newCustomer = {
      id: (customers.length + 1).toString(),
      name: body.name,
      email: body.email,
      company: body.company || '',
      totalComplaints: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    }
    
    customers.push(newCustomer)
    
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