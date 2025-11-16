#!/usr/bin/env python3
"""
🎯 MASTER API TEST RUNNER 🎯
============================

Comprehensive test orchestrator for all API testing suites.
Runs all tests in sequence and provides unified reporting.

Usage:
    python backend/run_all_tests.py                    # Run all tests
    python backend/run_all_tests.py --quick            # Quick tests only
    python backend/run_all_tests.py --comprehensive    # Comprehensive suite
    python backend/run_all_tests.py --stress          # Stress tests
    python backend/run_all_tests.py --functions       # Function calling tests
    python backend/run_all_tests.py --export results.json  # Export results
"""

import asyncio
import argparse
import json
import time
from datetime import datetime
from pathlib import Path
import sys

# Test suite imports
sys.path.insert(0, str(Path(__file__).parent))

print("🚀 Loading test suites...")

try:
    from test_api_comprehensive import ComprehensiveAPITester
    from test_api_stress import StressTester
    from test_api_function_calling import FunctionCallTester
    print("✅ All test suites loaded successfully\n")
except ImportError as e:
    print(f"❌ Failed to load test suites: {e}")
    sys.exit(1)


class MasterTestRunner:
    """Orchestrates all API testing suites."""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "comprehensive": None,
            "stress": None,
            "function_calling": None,
            "summary": {}
        }
    
    async def run_comprehensive_tests(self, quick: bool = False):
        """Run comprehensive API tests."""
        print("\n" + "="*100)
        print("📋 PHASE 1: COMPREHENSIVE API VALIDATION")
        print("="*100)
        
        tester = ComprehensiveAPITester(verbose=False)
        start = time.time()
        
        try:
            await tester.run_all_tests(quick=quick)
            duration = time.time() - start
            
            success = sum(1 for r in tester.results if r.status == "success")
            total = len(tester.results)
            
            self.results["comprehensive"] = {
                "status": "completed",
                "duration_seconds": duration,
                "total_tests": total,
                "successful": success,
                "success_rate": (success / total * 100) if total > 0 else 0
            }
            
            print(f"\n✅ Comprehensive tests completed in {duration:.1f}s")
            return True
            
        except Exception as e:
            print(f"\n❌ Comprehensive tests failed: {e}")
            self.results["comprehensive"] = {
                "status": "failed",
                "error": str(e)
            }
            return False
    
    async def run_stress_tests(self):
        """Run stress and performance tests."""
        print("\n" + "="*100)
        print("💪 PHASE 2: STRESS & PERFORMANCE TESTING")
        print("="*100)
        
        tester = StressTester()
        start = time.time()
        
        try:
            await tester.run_stress_tests(
                provider="openrouter",
                concurrent=5,
                duration=30
            )
            duration = time.time() - start
            
            self.results["stress"] = {
                "status": "completed",
                "duration_seconds": duration
            }
            
            print(f"\n✅ Stress tests completed in {duration:.1f}s")
            return True
            
        except Exception as e:
            print(f"\n❌ Stress tests failed: {e}")
            self.results["stress"] = {
                "status": "failed",
                "error": str(e)
            }
            return False
    
    async def run_function_calling_tests(self):
        """Run function calling tests."""
        print("\n" + "="*100)
        print("🎯 PHASE 3: FUNCTION CALLING VALIDATION")
        print("="*100)
        
        tester = FunctionCallTester()
        start = time.time()
        
        try:
            await tester.run_tests()
            duration = time.time() - start
            
            self.results["function_calling"] = {
                "status": "completed",
                "duration_seconds": duration
            }
            
            print(f"\n✅ Function calling tests completed in {duration:.1f}s")
            return True
            
        except Exception as e:
            print(f"\n❌ Function calling tests failed: {e}")
            self.results["function_calling"] = {
                "status": "failed",
                "error": str(e)
            }
            return False
    
    async def run_all(self, quick: bool = False, comprehensive: bool = True, 
                     stress: bool = False, functions: bool = False):
        """Run all selected test suites."""
        print("\n" + "="*100)
        print("🚀 MASTER API TEST SUITE")
        print("="*100)
        print(f"\nStarting test execution at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Test Configuration:")
        print(f"  • Comprehensive: {comprehensive}")
        print(f"  • Stress Testing: {stress}")
        print(f"  • Function Calling: {functions}")
        print(f"  • Quick Mode: {quick}")
        
        overall_start = time.time()
        
        # Run selected test suites
        if comprehensive:
            await self.run_comprehensive_tests(quick=quick)
        
        if stress:
            await self.run_stress_tests()
        
        if functions:
            await self.run_function_calling_tests()
        
        total_duration = time.time() - overall_start
        
        # Generate summary
        self.results["summary"] = {
            "total_duration_seconds": total_duration,
            "total_duration_formatted": f"{int(total_duration // 60)}m {int(total_duration % 60)}s",
            "completed_suites": sum(1 for k, v in self.results.items() 
                                   if k not in ["timestamp", "summary"] and v and v.get("status") == "completed"),
            "failed_suites": sum(1 for k, v in self.results.items() 
                                if k not in ["timestamp", "summary"] and v and v.get("status") == "failed")
        }
        
        self.print_final_summary()
    
    def print_final_summary(self):
        """Print comprehensive final summary."""
        print("\n" + "="*100)
        print("🏆 FINAL TEST SUMMARY")
        print("="*100 + "\n")
        
        summary = self.results["summary"]
        
        print(f"⏱️  Total Execution Time: {summary['total_duration_formatted']}")
        print(f"✅ Completed Suites: {summary['completed_suites']}")
        print(f"❌ Failed Suites: {summary['failed_suites']}")
        print()
        
        # Individual suite results
        print("📊 Suite Details:\n")
        
        suites = {
            "Comprehensive Tests": self.results.get("comprehensive"),
            "Stress Tests": self.results.get("stress"),
            "Function Calling Tests": self.results.get("function_calling")
        }
        
        for suite_name, suite_result in suites.items():
            if suite_result:
                status = suite_result.get("status", "unknown")
                status_icon = "✅" if status == "completed" else "❌"
                
                print(f"{status_icon} {suite_name}: {status}")
                
                if status == "completed":
                    duration = suite_result.get("duration_seconds", 0)
                    print(f"   Duration: {duration:.1f}s")
                    
                    if "total_tests" in suite_result:
                        print(f"   Tests: {suite_result['total_tests']}")
                        print(f"   Success Rate: {suite_result['success_rate']:.1f}%")
                
                elif status == "failed":
                    error = suite_result.get("error", "Unknown error")
                    print(f"   Error: {error}")
                
                print()
        
        # Overall verdict
        if summary['failed_suites'] == 0 and summary['completed_suites'] > 0:
            print("🎉 ALL TESTS PASSED! Your API configuration is excellent!")
        elif summary['failed_suites'] > 0:
            print("⚠️  Some test suites failed. Review the errors above.")
        else:
            print("❓ No test suites were executed.")
        
        print("\n" + "="*100 + "\n")
    
    def export_results(self, filename: str):
        """Export test results to JSON file."""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"✅ Results exported to {filename}")


async def main():
    parser = argparse.ArgumentParser(
        description="Master API Test Runner - Orchestrates all test suites",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_all_tests.py                        # Run comprehensive tests only
  python run_all_tests.py --all                  # Run all test suites
  python run_all_tests.py --quick --all          # Quick run of all suites
  python run_all_tests.py --stress --functions   # Stress and function tests
  python run_all_tests.py --export results.json  # Export results
        """
    )
    
    parser.add_argument('--quick', action='store_true', 
                       help='Run quick tests only (faster, less comprehensive)')
    parser.add_argument('--all', action='store_true',
                       help='Run all test suites')
    parser.add_argument('--comprehensive', action='store_true',
                       help='Run comprehensive API tests (default)')
    parser.add_argument('--stress', action='store_true',
                       help='Run stress and performance tests')
    parser.add_argument('--functions', action='store_true',
                       help='Run function calling tests')
    parser.add_argument('--export', type=str, metavar='FILE',
                       help='Export results to JSON file')
    
    args = parser.parse_args()
    
    # Default to comprehensive if no specific suite selected
    if not (args.all or args.comprehensive or args.stress or args.functions):
        args.comprehensive = True
    
    # --all flag enables all suites
    if args.all:
        args.comprehensive = True
        args.stress = True
        args.functions = True
    
    runner = MasterTestRunner()
    
    try:
        await runner.run_all(
            quick=args.quick,
            comprehensive=args.comprehensive,
            stress=args.stress,
            functions=args.functions
        )
        
        if args.export:
            runner.export_results(args.export)
    
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Testing failed with unexpected error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
